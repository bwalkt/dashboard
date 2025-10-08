# OpenZiti Integration for SFDC Server

This document explains how to configure and use OpenZiti zero-trust networking with the SFDC API server.

## Overview

OpenZiti integration provides zero-trust networking capabilities to the SFDC API server, ensuring that only authenticated and authorized clients can access the services through encrypted connections.

## Configuration

### Environment Variables

The following environment variables control OpenZiti integration:

- `OPENZITI_ENABLED`: Set to `true` to enable OpenZiti integration
- `OPENZITI_CONTROLLER_URL`: URL of your OpenZiti Controller
- `OPENZITI_IDENTITY_PATH`: Path to the OpenZiti identity configuration file
- `OPENZITI_SERVICE_NAME`: Name of the service in OpenZiti network
- `OPENZITI_LOCAL_ADDRESS`: Local address where the server binds
- `OPENZITI_TUNNELER_ENABLED`: Enable tunneler mode (alternative to embedded SDK)
- `OPENZITI_TUNNELER_CONFIG_PATH`: Path to tunneler configuration file

### Identity Configuration

Create an OpenZiti identity configuration file at `./config/ziti-identity.json`:

```json
{
  "id": "your-identity-id",
  "name": "sfdc-server-identity",
  "ca": "your-ca-certificate",
  "cert": "your-client-certificate",
  "key": "your-client-private-key",
  "server_cert": "your-server-certificate",
  "server_key": "your-server-private-key"
}
```

### Tunneler Configuration

If using tunneler mode, create a configuration file at `./config/tunneler.json`:

```json
{
  "hostname": "localhost",
  "port": 8080,
  "identity": "./config/ziti-identity.json",
  "services": [
    {
      "name": "sfdc-api-server",
      "protocol": "tcp",
      "hostname": "127.0.0.1",
      "port": 8080
    }
  ]
}
```

## Setup Instructions

### 1. Install OpenZiti CLI

The Dockerfile automatically installs the OpenZiti CLI. For local development:

```bash
# Download and install OpenZiti CLI
wget https://github.com/openziti/ziti/releases/latest/download/ziti-linux-amd64-0.38.0.tar.gz
tar -xzf ziti-linux-amd64-0.38.0.tar.gz
sudo mv ziti /usr/local/bin/
```

### 2. Create OpenZiti Network

1. Deploy an OpenZiti Controller and Edge Router
2. Create identities for your server and clients
3. Define services and policies in OpenZiti
4. Enroll identities

### 3. Configure the Server

1. Copy `env.example` to `.env`
2. Set `OPENZITI_ENABLED=true`
3. Configure other OpenZiti environment variables
4. Place your identity configuration file in the specified path

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## Features

### Zero-Trust Networking

- All connections are encrypted and authenticated
- No open ports exposed to the internet
- Fine-grained access control through OpenZiti policies

### Monitoring and Health Checks

- Health check endpoint: `GET /health/openziti`
- Connection monitoring and metrics
- Automatic cleanup of inactive connections

### Middleware Integration

- Request authentication through OpenZiti headers
- Service name validation
- Connection tracking and logging

## API Endpoints

### Health Check

```http
GET /health/openziti
```

Returns OpenZiti service status, connection information, and health metrics.

### Headers

The following headers are used for OpenZiti integration:

- `X-OpenZiti-Connection-Id`: Unique connection identifier
- `X-OpenZiti-Service`: Service name being accessed
- `X-OpenZiti-Status`: Connection status
- `X-OpenZiti-Connections`: Number of active connections

## Troubleshooting

### Common Issues

1. **Identity file not found**: Ensure the identity configuration file exists at the specified path
2. **Controller connection failed**: Verify the controller URL and network connectivity
3. **Service not accessible**: Check OpenZiti policies and service configuration

### Logs

Check server logs for OpenZiti-related messages:

```bash
# View logs
docker logs <container-name>

# Follow logs
docker logs -f <container-name>
```

### Debug Mode

Enable debug logging by setting the log level:

```bash
export LOG_LEVEL=debug
```

## Security Considerations

- Keep identity files secure and never commit them to version control
- Use strong authentication policies in OpenZiti
- Regularly rotate certificates and keys
- Monitor connection logs for suspicious activity

## Support

For OpenZiti-specific issues, refer to the [OpenZiti Documentation](https://openziti.io/docs/) or [Community Forums](https://openziti.io/community).
