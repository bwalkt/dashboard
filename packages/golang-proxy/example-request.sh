#!/bin/bash

# Example request to GET http://pzero-sfdc-server:3000/auth/me through golang proxy
# The golang proxy runs on port 8080 (default) and accepts POST requests to /proxy

# Make sure the proxy is running and .env is configured:
# ALLOWED_DOMAINS=pzero-sfdc-server:3000

PROXY_URL="http://localhost:8080/proxy"
TARGET_URL="http://pzero-sfdc-server:3000/auth/me"

curl -X POST "$PROXY_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "'"$TARGET_URL"'",
    "method": "GET",
    "headers": {
      "Accept": "application/json",
      "User-Agent": "golang-proxy-client"
    }
  }' | jq .

# Alternative: Using httpie (if installed)
# http POST localhost:8080/proxy \
#   url="http://pzero-sfdc-server:3000/auth/me" \
#   method=GET \
#   headers:='{"Accept": "application/json"}'

