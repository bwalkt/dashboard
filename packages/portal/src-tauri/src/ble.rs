use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter, WriteType};
use btleplug::platform::{Adapter, Manager, Peripheral};
use serde::{Deserialize, Serialize};
use std::error::Error;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use uuid::Uuid;

// BLE Service and Characteristic UUIDs (must match mobile)
const BLE_SERVICE_UUID: &str = "550e8400-e29b-41d4-a716-446655440000";
const BLE_CHARACTERISTIC_GET_ENDPOINTS: &str = "550e8400-e29b-41d4-a716-446655440001";
const BLE_CHARACTERISTIC_GET_TOKEN: &str = "550e8400-e29b-41d4-a716-446655440002";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BLERequest {
    #[serde(rename = "type")]
    pub request_type: String,
    #[serde(rename = "endpointId", skip_serializing_if = "Option::is_none")]
    pub endpoint_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BLEResponse {
    #[serde(rename = "type")]
    pub response_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Endpoint {
    pub id: String,
    pub name: String,
    #[serde(rename = "baseURI", skip_serializing_if = "Option::is_none")]
    pub base_uri: Option<String>,
    pub status: String,
}

pub struct BLEManager {
    adapter: Option<Adapter>,
    peripheral: Arc<Mutex<Option<Peripheral>>>,
}

impl BLEManager {
    pub fn new() -> Self {
        Self {
            adapter: None,
            peripheral: Arc::new(Mutex::new(None)),
        }
    }

    /// Initialize BLE adapter
    pub async fn initialize(&mut self) -> Result<(), Box<dyn Error>> {
        println!("Initializing BLE adapter...");
        let manager = Manager::new().await?;

        // Get the first Bluetooth adapter
        let adapters = manager.adapters().await?;
        let adapter = adapters
            .into_iter()
            .next()
            .ok_or("No Bluetooth adapters found")?;

        println!("Using adapter: {:?}", adapter.adapter_info().await?);
        self.adapter = Some(adapter);

        Ok(())
    }

    /// Scan for and connect to mobile device
    pub async fn connect(&self) -> Result<(), Box<dyn Error>> {
        let adapter = self.adapter.as_ref().ok_or("BLE adapter not initialized")?;

        println!("Starting BLE scan...");

        // Start scanning for devices
        adapter
            .start_scan(ScanFilter {
                services: vec![Uuid::parse_str(BLE_SERVICE_UUID)?],
            })
            .await?;

        // Use a bounded retry loop instead of fixed sleep
        // Read NO_RETRIES from environment variable, default to 10
        // Each retry waits 500ms, so 10 retries = 5 seconds total timeout
        let max_tries = std::env::var("NO_RETRIES")
            .ok()
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(10);
        let mut tries = 0;

        println!("Waiting for devices to be discovered...");
        while tries < max_tries {
            let peripherals = adapter.peripherals().await?;

            if !peripherals.is_empty() {
                println!("Found {} peripherals after {} tries", peripherals.len(), tries + 1);
                break;
            }

            tokio::time::sleep(Duration::from_millis(500)).await;
            tries += 1;
        }

        // Always stop scanning, regardless of outcome
        let stop_result = adapter.stop_scan().await;
        if let Err(e) = stop_result {
            eprintln!("Warning: Failed to stop scan: {}", e);
        } else {
            println!("BLE scan stopped");
        }

        // Get discovered peripherals
        let peripherals = adapter.peripherals().await?;

        if peripherals.is_empty() {
            return Err("No BLE devices found with the required service".into());
        }

        println!("Found {} peripherals", peripherals.len());

        // Connect to the first peripheral with our service
        let service_uuid = Uuid::parse_str(BLE_SERVICE_UUID)?;
        for peripheral in peripherals {
            let properties = peripheral.properties().await?;
            let is_connected = peripheral.is_connected().await?;
            let local_name = properties
                .as_ref()
                .and_then(|p| p.local_name.clone())
                .unwrap_or_else(|| "Unknown".to_string());

            println!(
                "Found peripheral: {} (connected: {})",
                local_name, is_connected
            );

            // Check if this peripheral has our service
            if let Some(props) = properties {
                let services = props.services;
                if services.contains(&service_uuid) {
                    println!("Connecting to peripheral: {}", local_name);

                    if !is_connected {
                        peripheral.connect().await?;
                    }

                    peripheral.discover_services().await?;

                    // Store the peripheral
                    let mut periph_lock = self.peripheral.lock().await;
                    *periph_lock = Some(peripheral);

                    println!("Connected to mobile device");
                    return Ok(());
                }
            }
        }

        Err("No suitable peripheral found".into())
    }

    /// Disconnect from mobile device
    pub async fn disconnect(&self) -> Result<(), Box<dyn Error>> {
        let mut periph_lock = self.peripheral.lock().await;

        if let Some(peripheral) = periph_lock.as_ref() {
            if peripheral.is_connected().await? {
                peripheral.disconnect().await?;
                println!("Disconnected from mobile device");
            }
        }

        *periph_lock = None;
        Ok(())
    }

    /// Check if connected to a device
    pub async fn is_connected(&self) -> bool {
        let periph_lock = self.peripheral.lock().await;
        if let Some(peripheral) = periph_lock.as_ref() {
            peripheral.is_connected().await.unwrap_or(false)
        } else {
            false
        }
    }

    /// Send a request and get response
    async fn send_request(&self, request: BLERequest) -> Result<BLEResponse, Box<dyn Error>> {
        let periph_lock = self.peripheral.lock().await;
        let peripheral = periph_lock.as_ref().ok_or("Not connected to any device")?;

        if !peripheral.is_connected().await? {
            return Err("Device not connected".into());
        }

        // Get the service
        let service_uuid = Uuid::parse_str(BLE_SERVICE_UUID)?;
        let services = peripheral.services();
        let service = services
            .iter()
            .find(|s| s.uuid == service_uuid)
            .ok_or("Service not found")?;

        // Get the characteristic based on request type
        let char_uuid_str = match request.request_type.as_str() {
            "getEndpoints" => BLE_CHARACTERISTIC_GET_ENDPOINTS,
            "getToken" => BLE_CHARACTERISTIC_GET_TOKEN,
            _ => return Err("Unknown request type".into()),
        };

        let char_uuid = Uuid::parse_str(char_uuid_str)?;
        let characteristic = service
            .characteristics
            .iter()
            .find(|c| c.uuid == char_uuid)
            .ok_or("Characteristic not found")?;

        // Write request with timeout
        let write_timeout_secs = std::env::var("BLE_WRITE_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(5);
        let request_data = serde_json::to_vec(&request)?;
        tokio::time::timeout(Duration::from_secs(write_timeout_secs), async {
            peripheral
                .write(characteristic, &request_data, WriteType::WithResponse)
                .await
        })
        .await
        .map_err(|_| "BLE write timeout")??;

        // Read response with timeout
        let read_timeout_secs = std::env::var("BLE_READ_TIMEOUT_SECS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(5);
        let response_data = tokio::time::timeout(Duration::from_secs(read_timeout_secs), async {
            peripheral.read(characteristic).await
        })
        .await
        .map_err(|_| "BLE read timeout")??;
        let response: BLEResponse = serde_json::from_slice(&response_data)?;

        Ok(response)
    }

    /// Request endpoints from mobile device
    pub async fn get_endpoints(&self) -> Result<Vec<Endpoint>, Box<dyn Error>> {
        println!("Requesting endpoints from mobile...");

        let response = self
            .send_request(BLERequest {
                request_type: "getEndpoints".to_string(),
                endpoint_id: None,
            })
            .await?;

        if response.response_type == "error" {
            return Err(response
                .error
                .unwrap_or_else(|| "Unknown error".to_string())
                .into());
        }

        if response.response_type != "endpoints" {
            return Err("Invalid response type".into());
        }

        let endpoints: Vec<Endpoint> =
            serde_json::from_value(response.data.ok_or("No data in response")?)?;

        println!("Received {} endpoints", endpoints.len());
        Ok(endpoints)
    }

    /// Request token for a specific endpoint from mobile device
    pub async fn get_token(&self, endpoint_id: String) -> Result<String, Box<dyn Error>> {
        println!("Requesting token for endpoint: {}", endpoint_id);

        let response = self
            .send_request(BLERequest {
                request_type: "getToken".to_string(),
                endpoint_id: Some(endpoint_id),
            })
            .await?;

        if response.response_type == "error" {
            return Err(response
                .error
                .unwrap_or_else(|| "Unknown error".to_string())
                .into());
        }

        if response.response_type != "token" {
            return Err("Invalid response type".into());
        }

        let token = response
            .data
            .and_then(|d| d.as_str().map(String::from))
            .ok_or("No token in response")?;

        println!("Received token: {}", token);
        Ok(token)
    }
}
