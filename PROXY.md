# Golang Proxy with OpenZiti

This is a Go proxy server that demonstrates how to run a service behind an OpenZiti edge router. The proxy allows you to make requests to other services through the OpenZiti network.

## Prerequisites

- Docker and Docker Compose installed
- OpenZiti desktop edge application (tunneler)

## Getting Started

### 1. Download OpenZiti Tunneler

Download and install the OpenZiti Tunneler for macOS:

- Visit: https://netfoundry.io/docs/openziti/reference/tunnelers/macos
- Follow the installation instructions for your operating system

### 2. Configure Environment

Navigate to the `packages/golang-proxy` directory and set up your environment:

```bash
cd packages/golang-proxy
cp env.example .env
```

Update the `.env` file with your configuration:

- `ALLOWED_DOMAINS`: Comma-separated list of domains the proxy can forward requests to
- `CORS_ALLOWED_ORIGIN`: The origin(s) allowed for CORS requests
- `ENVIRONMENT`: Set to `development` or `production`
- `DEBUG`: Set to `true` for debug logging

### 3. Start the Application

Start the Docker containers:

```bash
docker compose up
```

This will start the proxy server and make it available through the OpenZiti network.

### 4. Get the Enrollment JWT

1. Go to the OpenZiti Admin Console: https://ziti-controller.incmix.com:1280/zac/
2. Login with credentials:
   - Username: `admin`
   - Password: `admin`
3. Navigate to the **Identities** page
4. Click on the identity for `golang-proxy` (or the appropriate identity name)
5. Click **Download Enrollment JWT**

### 5. Add JWT to Ziti Desktop App

1. Open the Ziti desktop edge app that was downloaded in step 1
2. Add the downloaded JWT file
   - This is a one-time step; skip if the JWT has already been added previously
3. Click on **Enroll**

### 6. Enable Ziti Connection

1. Click the **Turn Ziti On** button
2. Allow VPN permissions when prompted by your system
3. Wait for the status to change to **Connected**

### 7. Test the Connection

Once the Ziti connection is established, test the proxy service by making a POST request to `/proxy`:

```bash
curl -X POST http://golang-proxy.ziti:8080/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://your-target-service:port/path",
    "method": "GET",
    "headers": {
      "Accept": "application/json"
    }
  }'
```

Replace `your-target-service:port/path` with the actual service endpoint you want to proxy to (must be in the `ALLOWED_DOMAINS` list).

### 8. Verify Success

If the setup is working correctly, you should receive a JSON response:

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

This confirms that the proxy is running correctly behind the OpenZiti network.

## API Usage

The proxy accepts POST requests to `/proxy` with a JSON body containing:

- `url` (required): The target URL to proxy to
- `method` (optional, defaults to GET): HTTP method
- `headers` (optional): Map of headers to send with the request
- `body` (optional): Request body for POST/PUT/PATCH requests

See `EXAMPLE.md` in the `golang-proxy` directory for more detailed usage examples.

## Troubleshooting

- Ensure Docker is running before starting the application
- Make sure you have the correct OpenZiti edge application installed
- Verify that the JWT has been successfully enrolled before attempting to connect
- Check that VPN permissions have been granted to the Ziti application
- Ensure the Ziti connection status shows "Connected" before testing the endpoint
- Verify that target domains are included in the `ALLOWED_DOMAINS` environment variable
- Check that ports match if specified in `ALLOWED_DOMAINS` (e.g., `service:3000` requires port 3000)

## Additional Information

- The proxy server runs on port 8080 within the Ziti network
- The service is accessible through the hostname `golang-proxy.ziti` (or as configured in OpenZiti)
- Target URLs must be in the `ALLOWED_DOMAINS` environment variable for security
- This setup demonstrates a zero-trust networking approach using OpenZiti
