use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter, WriteType};
use btleplug::platform::{Adapter, Manager, Peripheral};
use serde::{Deserialize, Serialize};
use sha2::{Sha256, Digest};
use std::error::Error;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use uuid::Uuid;

// BLE Service and Characteristic UUIDs (must match mobile)
const BLE_SERVICE_UUID: &str = "550e8400-e29b-41d4-a716-446655440000";
const BLE_CHARACTERISTIC_GET_ENDPOINTS: &str = "550e8400-e29b-41d4-a716-446655440001";
const BLE_CHARACTERISTIC_GET_TOKEN: &str = "550e8400-e29b-41d4-a716-446655440002";
const BLE_CHARACTERISTIC_DEVICE_PAIRING: &str = "550e8400-e29b-41d4-a716-446655440003";

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub uid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timestamp: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Endpoint {
    pub id: String,
    pub name: String,
    #[serde(rename = "baseURI", skip_serializing_if = "Option::is_none")]
    pub base_uri: Option<String>,
    pub status: String,
}

/// OOB (Out-of-Band) pairing data received from mobile via QR code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BLEOOBData {
    /// Device identifier (hex string)
    pub address: String,
    /// 128-bit random value (hex string)
    #[serde(rename = "randomValue")]
    pub random_value: String,
    /// SHA-256 of random value (hex string)
    #[serde(rename = "confirmValue")]
    pub confirm_value: String,
    /// Unix timestamp when OOB data was generated
    pub timestamp: u64,
    /// How long the data is valid (seconds)
    #[serde(rename = "expirySeconds")]
    pub expiry_seconds: u64,
}

impl BLEOOBData {
    /// Parse OOB data from JSON string (e.g., from QR code)
    pub fn from_json(json: &str) -> Result<Self, Box<dyn Error + Send + Sync>> {
        let data: BLEOOBData = serde_json::from_str(json)?;
        Ok(data)
    }

    /// Check if OOB data is still valid (not expired)
    pub fn is_valid(&self) -> bool {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        now < self.timestamp + self.expiry_seconds
    }

    /// Verify the confirmation value matches the random value
    pub fn verify_confirm(&self) -> bool {
        // Decode random value from hex
        let random_bytes = match hex::decode(&self.random_value) {
            Ok(bytes) => bytes,
            Err(_) => return false,
        };

        // Calculate SHA-256 of random value
        let mut hasher = Sha256::new();
        hasher.update(&random_bytes);
        let computed_confirm = hex::encode(hasher.finalize());

        // Compare with provided confirm value
        computed_confirm == self.confirm_value
    }
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
        // Ensure at least 1 retry to provide minimum 500ms discovery window
        let max_tries = std::env::var("NO_RETRIES")
            .ok()
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(10)
            .max(1); // Ensure at least one retry attempt (500ms discovery window)
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
            "devicePairing" => BLE_CHARACTERISTIC_DEVICE_PAIRING,
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

    /// Verify device proximity by retrieving UID via BLE
    pub async fn verify_device_proximity(&self) -> Result<String, Box<dyn Error>> {
        println!("Verifying device proximity via BLE...");

        let response = self
            .send_request(BLERequest {
                request_type: "devicePairing".to_string(),
                endpoint_id: None,
            })
            .await?;

        if response.response_type == "error" {
            return Err(response
                .error
                .unwrap_or_else(|| "Unknown error".to_string())
                .into());
        }

        if response.response_type != "device_pairing" {
            return Err("Invalid response type".into());
        }

        let uid = response
            .uid
            .ok_or("No UID in device pairing response")?;

        println!("Device proximity verified. UID: {}", uid);
        Ok(uid)
    }

    /// Connect to mobile device using OOB pairing data from QR code
    /// This provides higher security by verifying we're connecting to the intended device
    pub async fn connect_with_oob(&self, oob_data: BLEOOBData) -> Result<(), Box<dyn Error>> {
        println!("Connecting with OOB pairing data...");

        // Validate OOB data
        if !oob_data.is_valid() {
            return Err("OOB pairing data has expired".into());
        }

        if !oob_data.verify_confirm() {
            return Err("OOB confirmation value is invalid".into());
        }

        println!("OOB data validated, scanning for device: {}", oob_data.address);

        let adapter = self.adapter.as_ref().ok_or("BLE adapter not initialized")?;

        // Start scanning for devices with our service
        adapter
            .start_scan(ScanFilter {
                services: vec![Uuid::parse_str(BLE_SERVICE_UUID)?],
            })
            .await?;

        // Wait for devices to be discovered
        let max_tries = std::env::var("NO_RETRIES")
            .ok()
            .and_then(|v| v.parse::<u32>().ok())
            .unwrap_or(10)
            .max(1);
        let mut tries = 0;

        println!("Scanning for OOB device...");
        while tries < max_tries {
            let peripherals = adapter.peripherals().await?;
            if !peripherals.is_empty() {
                println!("Found {} peripherals", peripherals.len());
                break;
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
            tries += 1;
        }

        adapter.stop_scan().await?;

        // Get discovered peripherals
        let peripherals = adapter.peripherals().await?;
        if peripherals.is_empty() {
            return Err("No BLE devices found with the required service".into());
        }

        // Find the peripheral matching the OOB address
        let service_uuid = Uuid::parse_str(BLE_SERVICE_UUID)?;
        let mut found_peripheral: Option<Peripheral> = None;

        for peripheral in peripherals {
            let properties = peripheral.properties().await?;
            if let Some(props) = properties {
                // Check if this peripheral has our service
                if !props.services.contains(&service_uuid) {
                    continue;
                }

                // Check if this is the device we're looking for
                // iOS uses identifierForVendor (UUID), Android uses BLE address
                // We match by name containing "PZero" as backup
                let local_name = props.local_name.clone().unwrap_or_default();
                let address = peripheral.id().to_string();

                println!("Checking peripheral: {} (address: {})", local_name, address);

                // Try to match by address or name
                if address.to_lowercase().contains(&oob_data.address.to_lowercase())
                    || oob_data.address.to_lowercase().contains(&address.to_lowercase())
                    || (local_name.to_lowercase().contains("pzero")
                        && props.services.contains(&service_uuid))
                {
                    found_peripheral = Some(peripheral);
                    println!("Found matching device: {}", local_name);
                    break;
                }
            }
        }

        let peripheral = found_peripheral.ok_or("Device matching OOB data not found")?;

        // Connect to the device
        if !peripheral.is_connected().await? {
            println!("Connecting to device...");
            peripheral.connect().await?;
        }

        // Discover services (this triggers BLE pairing since characteristics require encryption)
        println!("Discovering services (this may trigger OS pairing dialog)...");
        peripheral.discover_services().await?;

        // Store the peripheral
        let mut periph_lock = self.peripheral.lock().await;
        *periph_lock = Some(peripheral);

        println!("Connected to mobile device with OOB verification");
        Ok(())
    }

    /// Parse OOB data from JSON string (convenience method)
    pub fn parse_oob_data(json: &str) -> Result<BLEOOBData, Box<dyn Error + Send + Sync>> {
        BLEOOBData::from_json(json)
    }
}
