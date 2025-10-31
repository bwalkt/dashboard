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

### 3. Create Docker Network

Create a Docker network named `pzero` that will be used by all services:

```bash
docker network create pzero
```

### 4. Start the Golang Proxy

Navigate to the golang-proxy directory and start the Docker containers:

```bash
cd packages/golang-proxy
docker compose up -d
```

This will start the proxy server and make it available through the OpenZiti network.

### 5. Start the SFDC Server

In a new terminal, navigate to the b2b examples directory and start the SFDC server:

```bash
cd examples/b2b
docker compose up -d
```

This will start the SFDC server and connect it to the `pzero` network.

### 6. Get the Enrollment JWT

1. Go to the OpenZiti Admin Console: https://ziti-controller.incmix.com:1280/zac/
2. Login with your provisioned credentials (e.g., from your secret manager).
   - Username: `<admin-username>`
   - Password: `<admin-password>`
3. Navigate to the **Identities** page
4. Click on the identity for `simple-client2` (or the appropriate identity name)
5. Click **Download Enrollment JWT**

### 7. Add JWT to Ziti Desktop App

1. Open the Ziti desktop edge app that was downloaded in step 1
2. Add the downloaded JWT file
   - This is a one-time step; skip if the JWT has already been added previously
3. Click on **Enroll**

### 8. Enable Ziti Connection

1. Click the **Turn Ziti On** button
2. Allow VPN permissions when prompted by your system
3. Wait for the status to change to **Connected**

### 9. Test the Application

In a new terminal, navigate to the SFDC example frontend and start the development server:

```bash
cd examples/b2b/packages/sfdc-example
pnpm dev
```

This will start the frontend application, which you can use to test the complete setup through the proxy and OpenZiti network.

**Note:** OpenZiti can be disabled for testing by setting `VITE_USE_PROXY=false` in the `sfdc-example` environment file. This allows you to test the application without going through the OpenZiti network.

### 10. Verify Success

If the setup is working correctly, you should be able to:

- Access the frontend application running on the development server
- Make requests through the proxy to the SFDC server
- See all services communicating through the OpenZiti network

This confirms that the proxy is running correctly behind the OpenZiti network and all services are properly connected.

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
- The service is accessible through the hostname `proxy.ziti:443` (or as configured in OpenZiti)
- Target URLs must be in the `ALLOWED_DOMAINS` environment variable for security
- This setup demonstrates a zero-trust networking approach using OpenZiti
