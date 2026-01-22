#!/bin/bash

# Test registration with device information

SERVER_URL="http://localhost:8090"
TEST_EMAIL="test-device-$(date +%s)@example.com"
TEST_NAME="Test User $(date +%s)"

echo "Testing registration with device info"
echo "Email: $TEST_EMAIL"
echo "Name: $TEST_NAME"
echo ""

# Registration request with device info
curl -X POST "$SERVER_URL/auth/register" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" \
  -d '{
    "name": "'"$TEST_NAME"'",
    "email": "'"$TEST_EMAIL"'",
    "device": {
      "id": "device-'"$(date +%s)"'",
      "deviceId": "curl-test-001",
      "deviceName": "Test Device",
      "systemName": "macOS",
      "systemVersion": "14.0",
      "brand": "Apple",
      "model": "MacBook Pro",
      "buildNumber": "1.0.0",
      "appVersion": "1.0.0",
      "appName": "curl-test",
      "uniqueId": "unique-'"$(date +%s)"'",
      "carrier": null,
      "ipAddress": "127.0.0.1",
      "macAddress": null,
      "deviceType": "desktop",
      "isEmulator": false,
      "isTablet": false,
      "ua": "curl/test",
      "manufacturer": "Apple",
      "os": "macOS",
      "osVersion": "14.0",
      "type": "CURL_TEST",
      "other": []
    }
  }' | jq '.'

echo ""
echo "Check server logs for device info logging"
echo ""
echo "To verify registration, use:"
echo "curl -X POST $SERVER_URL/auth/register/verify \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\": \"$TEST_EMAIL\", \"code\": \"<6-digit-code>\"}' | jq '.'"