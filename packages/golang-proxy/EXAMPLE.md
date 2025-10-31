# Example Request: GET /auth/me through Golang Proxy

This document shows how to make a request to `GET http://pzero-sfdc-server:3000/auth/me` through the golang proxy.

## Prerequisites

1. The golang proxy server should be running on port 8080
2. The `.env` file should be configured with:
   ```env
   ALLOWED_DOMAINS=pzero-sfdc-server:3000
   ```

## Request Format

The proxy accepts `POST` requests to `/proxy` with a JSON body containing:

- `url` (required): The target URL to proxy to
- `method` (optional, defaults to GET): HTTP method
- `headers` (optional): Map of headers to send with the request
- `body` (optional): Request body for POST/PUT/PATCH requests

## Examples

### Using cURL

```bash
curl -X POST http://localhost:8080/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://pzero-sfdc-server:3000/auth/me",
    "method": "GET",
    "headers": {
      "Accept": "application/json"
    }
  }'
```

### Using the shell script

```bash
chmod +x example-request.sh
./example-request.sh
```

### Using the JSON file

```bash
curl -X POST http://localhost:8080/proxy \
  -H "Content-Type: application/json" \
  -d @example-request.json
```

### Using httpie

```bash
http POST localhost:8080/proxy \
  url="http://pzero-sfdc-server:3000/auth/me" \
  method=GET \
  headers:='{"Accept": "application/json"}'
```

### Using JavaScript/fetch

```javascript
fetch("http://localhost:8080/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "http://pzero-sfdc-server:3000/auth/me",
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  }),
})
  .then((response) => {
    // Access HTTP response headers
    console.log("Status Code:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));

    // Access JSON response body
    return response.json();
  })
  .then((data) => console.log("Response Body:", data));
```

### Using Python requests

```python
import requests

response = requests.post(
    'http://localhost:8080/proxy',
    json={
        'url': 'http://pzero-sfdc-server:3000/auth/me',
        'method': 'GET',
        'headers': {
            'Accept': 'application/json'
        }
    }
)

# Access HTTP response headers
print("Status Code:", response.status_code)
print("Headers:", dict(response.headers))

# Access JSON response body
data = response.json()
print("Response Body:", data)
```

## Expected Response

The proxy returns a JSON response with the following structure:

**HTTP Response Headers:**

- All headers from the target server are copied to the HTTP response headers
- `Content-Type` is always set to `application/json` (to indicate the response body is JSON)
- Headers like `Content-Length`, `Transfer-Encoding`, etc. are managed by Go's HTTP server

**HTTP Response Body (JSON):**

```json
{
  "success": true,
  "message": "Request completed successfully",
  "data": {
    "statusCode": 200,
    "body": "{...response from target server...}"
  }
}
```

## Response Format Details

- **HTTP Status Code**: The status code from the target server response
- **HTTP Response Headers**: All headers from the target server (except `Content-Type`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Upgrade`)
- **JSON Response Body**:
  - `success`: Boolean indicating if the proxy request was successful
  - `message`: Human-readable message
  - `data`: Contains the proxied response:
    - `statusCode`: HTTP status code from the target server (duplicate of HTTP status code)
    - `body`: Response body as a string

## Error Handling

If the request fails, the response will have `success: false` and an error message:

```json
{
  "success": false,
  "message": "URL validation failed"
}
```

Common errors:

- `"URL validation failed"`: The target URL is not in the ALLOWED_DOMAINS list
- `"Invalid request format"`: The JSON payload is malformed
- `"URL is required"`: Missing required `url` field
- `"Request execution failed"`: Network error or target server unavailable

## Important Notes

⚠️ **Domain and Port Validation**: The proxy validates both the hostname and port of the target URL against entries in `ALLOWED_DOMAINS`.

**Port Validation Rules:**

- If the allowed domain includes a port (e.g., `pzero-sfdc-server:3000`), the target URL's port **must match exactly**.
- If the allowed domain doesn't include a port (e.g., `pzero-sfdc-server`), any valid port (80, 443, 3000, 8080, 8443) is allowed.
- For URLs without an explicit port, default ports are used (80 for HTTP, 443 for HTTPS).

**Examples:**

- `ALLOWED_DOMAINS=pzero-sfdc-server:3000` allows only `http://pzero-sfdc-server:3000/...`
- `ALLOWED_DOMAINS=pzero-sfdc-server` allows `http://pzero-sfdc-server:8080/...`, `https://pzero-sfdc-server:8443/...`, etc.
- `ALLOWED_DOMAINS=pzero-sfdc-server:3000,pzero-sfdc-server:8080` allows both ports 3000 and 8080

If you encounter validation errors, you may need to check:

1. The hostname in the URL matches an entry in `ALLOWED_DOMAINS`
2. If the allowed domain specifies a port, the target URL's port must match exactly
3. The port in the URL is one of the allowed ports (80, 443, 3000, 8080, 8443)
