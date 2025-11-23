#!/usr/bin/env node

/**
 * BLE Scanner Test Script
 *
 * Requirements:
 * - Linux: bluez installed, may require sudo or CAP_NET_ADMIN
 * - macOS: Bluetooth permissions granted in System Preferences
 * - Windows: Compatible Bluetooth 4.0+ adapter
 *
 * Usage:
 *   node test-ble-scan.js
 *   # or make executable: chmod +x test-ble-scan.js && ./test-ble-scan.js
 *
 * This script scans for BLE devices, first targeting service UUID
 * 550e8400e29b41d4a716446655440000, then performing a general scan.
 */

// Simple BLE scanner test using noble
import noble from "@abandonware/noble";

console.log("Starting BLE scanner test...");
console.log("Target service UUID: 550e8400e29b41d4a716446655440000");

let scanTimeout1, scanTimeout2;

noble.on("stateChange", (state) => {
  console.log("BLE State:", state);

  if (state === "poweredOn") {
    console.log("Starting scan for BLE devices...");
    try {
      // Scan for our specific service UUID
      noble.startScanning(["550e8400e29b41d4a716446655440000"], false);
    } catch (error) {
      console.error("Failed to start scanning:", error);
      process.exit(1);
    }

    // Also scan for all devices to test general functionality
    scanTimeout1 = setTimeout(() => {
      console.log("Starting general scan...");
      try {
        noble.stopScanning();
        noble.startScanning([], false);
      } catch (error) {
        console.error("Failed to start general scan:", error);
      }
    }, 5000);

    // Stop after 15 seconds
    scanTimeout2 = setTimeout(() => {
      console.log("Stopping scan...");
      try {
        noble.stopScanning();
      } catch (error) {
        console.error("Failed to stop scanning:", error);
      }
      // Give stopScanning time to complete
      setTimeout(() => process.exit(0), 100);
    }, 15000);
  } else {
    // Clean up any pending timeouts
    if (scanTimeout1) clearTimeout(scanTimeout1);
    if (scanTimeout2) clearTimeout(scanTimeout2);
    console.log("BLE not available. State:", state);
    process.exit(1);
  }
});

noble.on("scanStart", () => {
  console.log("✅ BLE scan started");
});

noble.on("scanStop", () => {
  console.log("⏹️  BLE scan stopped");
});

noble.on("discover", (peripheral) => {
  const name = peripheral.advertisement.localName || "Unknown";
  const rssi = peripheral.rssi;
  const serviceUuids = peripheral.advertisement.serviceUuids || [];

  console.log(`📱 Found device: ${name} (RSSI: ${rssi})`);
  if (serviceUuids.length > 0) {
    console.log(`   Services: ${serviceUuids.join(", ")}`);
  }

  // Check if this is our target device
  const targetUuid = "550e8400e29b41d4a716446655440000";
  if (
    serviceUuids.some((uuid) => uuid.toLowerCase() === targetUuid.toLowerCase())
  ) {
    console.log("🎯 FOUND TARGET DEVICE! This is our mobile app!");
  }
});

noble.on("warning", (message) => {
  console.log("⚠️  Warning:", message);
});

console.log("Waiting for BLE to initialize...");
