# OpenZiti Docker Compose Setup

This document describes how to start and configure the OpenZiti network infrastructure using Docker Compose.

## 🚀 Overview

OpenZiti is a zero-trust networking platform that provides secure, encrypted communication between services. This compose file sets up a complete OpenZiti environment including:

- **Ziti Controller**: The central management component
- **Ziti Edge Router**: Handles client connections and traffic routing
- **Ziti Console (ZAC)**: Web-based administration interface
- **Initialization Container**: Sets up access control policies

## 📋 Prerequisites

- Docker and Docker Compose installed
- Ports 1280, 6262, 3022, 10080, and 8443 available on your system
- Basic understanding of zero-trust networking concepts

## 🛠️ Quick Start

### 1. Start OpenZiti Services

```bash
# Start all OpenZiti services
docker-compose -f docker-compose.ziti.yml up -d

# Check service status
docker-compose -f docker-compose.ziti.yml ps

# View logs
docker-compose -f docker-compose.ziti.yml logs -f
```

### 2. Access the Ziti Console

Once all services are running, access the Ziti Console at:

```
https://localhost:8443
```

**Note**: You may need to accept the self-signed certificate in your browser.

## 🔧 Service Details

### Ziti Controller (`ziti-controller`)

- **Purpose**: Central management and policy enforcement
- **Ports**: 1280 (Edge), 6262 (Fabric)
- **Health Check**: Monitors controller availability
- **Dependencies**: None (starts first)

### Ziti Edge Router (`ziti-edge-router`)

- **Purpose**: Handles client connections and traffic routing
- **Ports**: 3022 (Edge), 10080 (Listener)
- **Role**: Public router for external access
- **Dependencies**: Controller must be healthy

### Ziti Console (`ziti-console`)

- **Purpose**: Web-based administration interface
- **Port**: 8443 (HTTPS)
- **Features**: Service management, identity creation, policy configuration
- **Dependencies**: Controller must be healthy

### Initialization Container (`ziti-controller-init-container`)

- **Purpose**: Sets up initial access control policies
- **Duration**: Runs once and exits
- **Dependencies**: Controller must be healthy

## 🌐 Network Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Ziti Console  │    │ Ziti Controller │    │ Ziti Edge Router│
│   (Port 8443)   │◄──►│ (Ports 1280,    │◄──►│ (Ports 3022,    │
│                 │    │  6262)          │    │  10080)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
   Web Browser              Management              Client Apps
                        & Policy Engine            & Services
```

## 🔒 Security Configuration

### Default Credentials

- **Username**: `admin` (configurable via `ZITI_USER`)
- **Password**: Set via `ZITI_PWD` environment variable

### Certificate Management

- Self-signed certificates are generated automatically
- Certificates are stored in the `ziti-fs` Docker volume
- Certificate paths are configured automatically

### Network Security

- All inter-service communication is encrypted
- Edge router uses public role for external access
- Controller and router communicate over the `ziti` network

## 📊 Monitoring and Logs

### View Service Logs

```bash
# All services
docker-compose -f docker-compose.ziti.yml logs -f

# Specific service
docker-compose -f docker-compose.ziti.yml logs -f ziti-controller
docker-compose -f docker-compose.ziti.yml logs -f ziti-edge-router
docker-compose -f docker-compose.ziti.yml logs -f ziti-console
```

### Health Checks

```bash
# Check service health
docker-compose -f docker-compose.ziti.yml ps

# Manual health check
curl -k https://localhost:1280/edge/client/v1/version
```

## 🛠️ Management Commands

### Start Services

```bash
docker-compose -f docker-compose.ziti.yml up -d
```

### Stop Services

```bash
docker-compose -f docker-compose.ziti.yml down
```

### Restart Services

```bash
docker-compose -f docker-compose.ziti.yml restart
```

### Update Services

```bash
docker-compose -f docker-compose.ziti.yml pull
docker-compose -f docker-compose.ziti.yml up -d
```

### Clean Up (Remove Volumes)

```bash
# Stop and remove containers, networks, and volumes
docker-compose -f docker-compose.ziti.yml down -v
```

## 🔧 Troubleshooting

### Common Issues

1. **Services Won't Start**

   - Check if required ports are available
   - Verify Docker and Docker Compose are running
   - Check environment variables in `.env` file

2. **Controller Health Check Fails**

   - Wait for initialization to complete (up to 30 retries)
   - Check controller logs for errors
   - Verify network connectivity

3. **Cannot Access Ziti Console**

   - Ensure port 8443 is not blocked by firewall
   - Accept self-signed certificate in browser
   - Check console service logs

4. **Authentication Issues**
   - Verify `ZITI_USER` and `ZITI_PWD` are set correctly
   - Check if initialization container completed successfully
   - Reset by running `docker-compose -f docker-compose.ziti.yml down -v`

### Log Analysis

```bash
# Check initialization status
docker-compose -f docker-compose.ziti.yml logs ziti-controller-init-container

# Monitor controller startup
docker-compose -f docker-compose.ziti.yml logs -f ziti-controller

# Check router enrollment
docker-compose -f docker-compose.ziti.yml logs -f ziti-edge-router
```

## 📚 Next Steps

After successfully starting OpenZiti:

1. **Access Ziti Console**: Navigate to `https://localhost:8443`
2. **Create Identities**: Set up identities for your applications
3. **Configure Services**: Define services and policies
4. **Deploy Clients**: Install Ziti clients on target systems
5. **Test Connectivity**: Verify secure communication between services

## 🔗 Additional Resources

- [OpenZiti Documentation](https://openziti.io/docs)
- [Ziti Console Guide](https://openziti.io/docs/core-concepts/console)
- [Zero Trust Networking Concepts](https://openziti.io/docs/core-concepts/zero-trust)

## 📄 Environment Variables Reference

| Variable                                 | Description                | Default                | Required |
| ---------------------------------------- | -------------------------- | ---------------------- | -------- |
| `ZITI_CTRL_NAME`                         | Controller name            | `ziti-edge-controller` | No       |
| `ZITI_CTRL_EDGE_ADVERTISED_ADDRESS`      | Edge advertised address    | `ziti-edge-controller` | No       |
| `ZITI_CTRL_EDGE_ADVERTISED_PORT`         | Edge advertised port       | `1280`                 | No       |
| `ZITI_CTRL_EDGE_IP_OVERRIDE`             | Edge IP override           | `127.0.0.1`            | No       |
| `ZITI_CTRL_ADVERTISED_PORT`              | Controller advertised port | `6262`                 | No       |
| `ZITI_ROUTER_NAME`                       | Router name                | `ziti-edge-router`     | No       |
| `ZITI_ROUTER_ADVERTISED_ADDRESS`         | Router advertised address  | `ziti-edge-router`     | No       |
| `ZITI_ROUTER_PORT`                       | Router port                | `3022`                 | No       |
| `ZITI_ROUTER_LISTENER_BIND_PORT`         | Router listener port       | `10080`                | No       |
| `ZITI_INTERFACE`                         | Network interface          | `0.0.0.0`              | No       |
| `ZITI_USER`                              | Admin username             | `admin`                | No       |
| `ZITI_PWD`                               | Admin password             | -                      | **Yes**  |
| `ZITI_EDGE_IDENTITY_ENROLLMENT_DURATION` | Edge enrollment duration   | -                      | No       |
| `ZITI_ROUTER_ENROLLMENT_DURATION`        | Router enrollment duration | -                      | No       |

---

**Note**: This setup is intended for development and testing. For production deployments, consider additional security hardening, certificate management, and monitoring configurations.
