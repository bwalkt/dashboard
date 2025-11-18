#!/usr/bin/env node

// Simple BLE scanner test using noble
import noble from "@abandonware/noble";

console.log("Starting BLE scanner test...");
console.log("Target service UUID: 550e8400-e29b-41d4-a716-446655440000");

noble.on("stateChange", (state) => {
  console.log("BLE State:", state);

  if (state === "poweredOn") {
    console.log("Starting scan for BLE devices...");
    // Scan for our specific service UUID
    noble.startScanning(["550e8400-e29b-41d4-a716-446655440000"], false);

    // Also scan for all devices to test general functionality
    setTimeout(() => {
      console.log("Starting general scan...");
      noble.stopScanning();
      noble.startScanning([], false);
    }, 5000);

    // Stop after 15 seconds
    setTimeout(() => {
      console.log("Stopping scan...");
      noble.stopScanning();
      process.exit(0);
    }, 15000);
  } else {
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
  if (serviceUuids.includes("550e8400-e29b-41d4-a716-446655440000")) {
    console.log("🎯 FOUND TARGET DEVICE! This is our mobile app!");
  }
});

noble.on("warning", (message) => {
  console.log("⚠️  Warning:", message);
});

console.log("Waiting for BLE to initialize...");
