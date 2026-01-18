import Foundation
import CoreBluetooth
import React
import CryptoKit
import UIKit

@objc(BLEPeripheralModule)
class BLEPeripheralModule: NSObject, CBPeripheralManagerDelegate {

  private var peripheralManager: CBPeripheralManager?
  private var service: CBMutableService?
  private var getEndpointsCharacteristic: CBMutableCharacteristic?
  private var getTokenCharacteristic: CBMutableCharacteristic?
  private var devicePairingCharacteristic: CBMutableCharacteristic?

  // Cached data for characteristics
  private var endpointsData: Data?
  private var tokensByEndpoint: [String: Data] = [:]
  private var validEndpointIds: Set<String> = []
  private var requestedEndpointId: String?
  private var currentUid: String?

  // OOB pairing data
  private var oobRandomValue: Data?
  private var oobTimestamp: Date?
  private let oobExpirySeconds: TimeInterval = 60.0

  // BLE Service and Characteristic UUIDs (must match verifier)
  private let serviceUUID = CBUUID(string: "550e8400-e29b-41d4-a716-446655440000")
  private let getEndpointsUUID = CBUUID(string: "550e8400-e29b-41d4-a716-446655440001")
  private let getTokenUUID = CBUUID(string: "550e8400-e29b-41d4-a716-446655440002")
  private let devicePairingUUID = CBUUID(string: "550e8400-e29b-41d4-a716-446655440003")

  override init() {
    super.init()
  }

  // MARK: - React Native Module Setup

  @objc
  static func moduleName() -> String! {
    return "BLEPeripheralModule"
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  // MARK: - Public API

  @objc
  func initialize(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      self.peripheralManager = CBPeripheralManager(delegate: self, queue: nil)
      resolve(true)
    }
  }

  @objc
  func startAdvertising(_ endpointsJSON: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let manager = peripheralManager else {
      reject("NOT_INITIALIZED", "Peripheral manager not initialized", nil)
      return
    }

    guard manager.state == .poweredOn else {
      reject("BLUETOOTH_OFF", "Bluetooth is not powered on", nil)
      return
    }

    // Store endpoints data and extract valid endpoint IDs
    if let data = endpointsJSON.data(using: .utf8) {
      self.endpointsData = data

      // Parse and extract valid endpoint IDs
      do {
        if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
           let endpointsArray = json["data"] as? [[String: Any]] {
          validEndpointIds.removeAll()
          for endpoint in endpointsArray {
            if let id = endpoint["id"] as? String, !id.isEmpty {
              validEndpointIds.insert(id)
            }
          }
          print("BLE Peripheral: Loaded \(validEndpointIds.count) valid endpoint IDs")
        }
      } catch {
        print("BLE Peripheral: Failed to parse endpoints JSON: \(error)")
      }
    }

    // Setup GATT service and characteristics
    setupService()

    // Start advertising
    let advertisementData: [String: Any] = [
      CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
      CBAdvertisementDataLocalNameKey: "PZero Mobile"
    ]

    manager.startAdvertising(advertisementData)

    resolve(true)
  }

  @objc
  func stopAdvertising(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let manager = peripheralManager else {
      reject("NOT_INITIALIZED", "Peripheral manager not initialized", nil)
      return
    }

    manager.stopAdvertising()

    if let service = service {
      manager.remove(service)
    }

    // Clear cached data to avoid stale reads
    self.endpointsData = nil
    self.tokensByEndpoint.removeAll()
    self.validEndpointIds.removeAll()
    self.requestedEndpointId = nil
    self.currentUid = nil

    // Clear OOB pairing data
    self.oobRandomValue = nil
    self.oobTimestamp = nil

    resolve(true)
  }

  @objc
  func isAdvertising(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let manager = peripheralManager else {
      resolve(false)
      return
    }

    resolve(manager.isAdvertising)
  }

  @objc
  func transmitUid(_ uid: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Store the UID for transmission via BLE
    self.currentUid = uid
    
    // Create response object
    let response: [String: Any] = [
      "type": "device_pairing",
      "uid": uid,
      "timestamp": Date().timeIntervalSince1970
    ]
    
    if let jsonData = try? JSONSerialization.data(withJSONObject: response, options: []) {
      print("BLE Peripheral: UID set for transmission: \(uid)")
      
      // If we have connected centrals, notify them of the new data
      if let characteristic = devicePairingCharacteristic,
         let manager = peripheralManager {
        manager.updateValue(jsonData, for: characteristic, onSubscribedCentrals: nil)
      }
      
      resolve(true)
    } else {
      reject("SERIALIZATION_ERROR", "Failed to serialize UID data", nil)
    }
  }

  @objc
  func generateOOBData(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Generate 128-bit (16 byte) cryptographically secure random value
    var randomBytes = [UInt8](repeating: 0, count: 16)
    let result = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)

    guard result == errSecSuccess else {
      reject("CRYPTO_ERROR", "Failed to generate secure random bytes", nil)
      return
    }

    let randomData = Data(randomBytes)
    self.oobRandomValue = randomData
    self.oobTimestamp = Date()

    // Convert to hex string for transmission
    let randomHex = randomData.map { String(format: "%02x", $0) }.joined()

    // Generate a simple confirmation value (hash of random value)
    // In production, this would use proper BLE OOB confirmation calculation
    let confirmData = randomData.sha256()
    let confirmHex = confirmData.map { String(format: "%02x", $0) }.joined()

    // Get device identifier (we use a stable app-specific identifier since iOS doesn't expose BLE address)
    let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString

    let oobData: [String: Any] = [
      "address": deviceId,
      "randomValue": randomHex,
      "confirmValue": confirmHex,
      "timestamp": Date().timeIntervalSince1970,
      "expirySeconds": oobExpirySeconds
    ]

    print("BLE Peripheral: Generated OOB pairing data")
    resolve(oobData)
  }

  @objc
  func isOOBDataValid(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let timestamp = oobTimestamp else {
      resolve(false)
      return
    }

    let elapsed = Date().timeIntervalSince(timestamp)
    resolve(elapsed < oobExpirySeconds)
  }

  @objc
  func clearOOBData(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    oobRandomValue = nil
    oobTimestamp = nil
    print("BLE Peripheral: Cleared OOB pairing data")
    resolve(true)
  }

  @objc
  func setTokenForEndpoint(_ endpointId: String, token: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Validate endpoint exists
    guard validEndpointIds.contains(endpointId) else {
      reject("INVALID_ENDPOINT", "Endpoint not found: \(endpointId)", nil)
      return
    }

    // Create response object
    let response: [String: Any] = [
      "type": "token",
      "data": token
    ]

    if let jsonData = try? JSONSerialization.data(withJSONObject: response, options: []) {
      self.tokensByEndpoint[endpointId] = jsonData
      print("BLE Peripheral: Token set for endpoint: \(endpointId)")
      resolve(true)
    } else {
      reject("SERIALIZATION_ERROR", "Failed to serialize token data", nil)
    }
  }

  // MARK: - Private Methods

  private func setupService() {
    // Create characteristics with encryption required for security
    // This forces BLE pairing before any data can be read/written
    getEndpointsCharacteristic = CBMutableCharacteristic(
      type: getEndpointsUUID,
      properties: [.read, .write],
      value: nil,
      permissions: [.readEncryptionRequired, .writeEncryptionRequired]
    )

    getTokenCharacteristic = CBMutableCharacteristic(
      type: getTokenUUID,
      properties: [.read, .write],
      value: nil,
      permissions: [.readEncryptionRequired, .writeEncryptionRequired]
    )

    devicePairingCharacteristic = CBMutableCharacteristic(
      type: devicePairingUUID,
      properties: [.read, .write, .notify],
      value: nil,
      permissions: [.readEncryptionRequired, .writeEncryptionRequired]
    )

    // Create service
    service = CBMutableService(type: serviceUUID, primary: true)

    // Safely unwrap characteristics
    guard let endpoints = getEndpointsCharacteristic, 
          let token = getTokenCharacteristic,
          let pairing = devicePairingCharacteristic else {
      print("BLE Peripheral: Failed to create characteristics")
      return
    }

    service?.characteristics = [endpoints, token, pairing]

    // Add service to peripheral manager
    guard let service = service else {
      print("BLE Peripheral: Failed to create service")
      return
    }
    peripheralManager?.add(service)
  }

  // MARK: - CBPeripheralManagerDelegate

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    switch peripheral.state {
    case .poweredOn:
      print("BLE Peripheral: Powered On")
    case .poweredOff:
      print("BLE Peripheral: Powered Off")
    case .resetting:
      print("BLE Peripheral: Resetting")
    case .unauthorized:
      print("BLE Peripheral: Unauthorized")
    case .unsupported:
      print("BLE Peripheral: Unsupported")
    case .unknown:
      print("BLE Peripheral: Unknown")
    @unknown default:
      print("BLE Peripheral: Unknown state")
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) {
    if let error = error {
      print("BLE Peripheral: Error adding service: \(error.localizedDescription)")
      return
    }
    print("BLE Peripheral: Service added successfully")
  }

  func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) {
    if let error = error {
      print("BLE Peripheral: Error starting advertising: \(error.localizedDescription)")
      return
    }
    print("BLE Peripheral: Advertising started successfully")
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveRead request: CBATTRequest) {
    print("BLE Peripheral: Received read request for characteristic: \(request.characteristic.uuid)")

    var responseData: Data?

    if request.characteristic.uuid == getEndpointsUUID {
      responseData = endpointsData
    } else if request.characteristic.uuid == getTokenUUID {
      if let endpointId = requestedEndpointId {
        print("BLE Peripheral: Client requesting token data for endpoint: \(endpointId)")
        responseData = tokensByEndpoint[endpointId]
      } else {
        print("BLE Peripheral: No endpoint ID specified in token request")
      }
    } else if request.characteristic.uuid == devicePairingUUID {
      if let uid = currentUid {
        let response: [String: Any] = [
          "type": "device_pairing",
          "uid": uid,
          "timestamp": Date().timeIntervalSince1970
        ]
        responseData = try? JSONSerialization.data(withJSONObject: response, options: [])
        print("BLE Peripheral: Client requesting device pairing data with UID: \(uid)")
      } else {
        print("BLE Peripheral: No UID available for device pairing")
      }
    }

    if let data = responseData {
      if request.offset >= data.count {
        peripheral.respond(to: request, withResult: .invalidOffset)
        return
      }

      request.value = data.subdata(in: request.offset..<data.count)
      peripheral.respond(to: request, withResult: .success)
      print("BLE Peripheral: Read request successful")
    } else {
      peripheral.respond(to: request, withResult: .unlikelyError)
      print("BLE Peripheral: No data available for characteristic")
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
    print("BLE Peripheral: Received write requests: \(requests.count)")

    for request in requests {
      guard let value = request.value else {
        peripheral.respond(to: request, withResult: .unlikelyError)
        continue
      }

      print("BLE Peripheral: Write request for \(request.characteristic.uuid)")

      // Parse the request JSON
      if let requestJSON = try? JSONSerialization.jsonObject(with: value, options: []) as? [String: Any],
         let requestType = requestJSON["type"] as? String {

        print("BLE Peripheral: Request type: \(requestType)")

        // Handle different request types
        if requestType == "getEndpoints" {
          // Endpoints data is already set when advertising started
          // The verifier will read it via didReceiveRead
          peripheral.respond(to: request, withResult: .success)
        } else if requestType == "getToken" {
          // Extract endpoint ID from request
          if request.characteristic.uuid == getTokenUUID {
            requestedEndpointId = requestJSON["endpointId"] as? String
            print("BLE Peripheral: Token request for endpoint: \(requestedEndpointId ?? "nil")")
          }
          // Token will be set by the app via setTokenForEndpoint
          // The verifier will read it via didReceiveRead
          peripheral.respond(to: request, withResult: .success)
        } else if requestType == "devicePairing" {
          // Handle device pairing request
          if request.characteristic.uuid == devicePairingUUID {
            print("BLE Peripheral: Device pairing request received")
            // The UID will be set by the app via transmitUid
            // The verifier will read it via didReceiveRead
          }
          peripheral.respond(to: request, withResult: .success)
        } else {
          peripheral.respond(to: request, withResult: .requestNotSupported)
        }
      } else {
        peripheral.respond(to: request, withResult: .unlikelyError)
      }
    }
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
    print("BLE Peripheral: Central subscribed to characteristic: \(characteristic.uuid)")
  }

  func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
    print("BLE Peripheral: Central unsubscribed from characteristic: \(characteristic.uuid)")
  }
}

// MARK: - Data Extension for SHA256

extension Data {
  func sha256() -> Data {
    let digest = SHA256.hash(data: self)
    return Data(digest)
  }
}
