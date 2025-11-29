-- Test user creation with device info
SELECT pzero.create_user('{
  "name": "Device Test User",
  "email": "device.test@example.com",
  "email_verified": true,
  "device": {
    "id": "test-device-001",
    "deviceId": "test-device-001", 
    "deviceName": "Test Device",
    "systemName": "macOS",
    "systemVersion": "14.0",
    "brand": "Apple",
    "model": "MacBook Pro",
    "type": "DESKTOP",
    "os": "macOS",
    "osVersion": "14.0"
  }
}'::jsonb) as result;