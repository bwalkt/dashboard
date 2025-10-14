# SigNoz Telemetry Setup Documentation

This document provides a comprehensive overview of the SigNoz observability platform setup and the different services used in this dashboard project.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Services Overview](#services-overview)
4. [SigNoz Components](#signoz-components)
5. [Data Flow](#data-flow)
6. [Configuration Files](#configuration-files)
7. [Monitoring & Observability](#monitoring--observability)
8. [Getting Started](#getting-started)
9. [Troubleshooting](#troubleshooting)

## Overview

SigNoz is an open-source observability platform that provides comprehensive monitoring, tracing, and logging capabilities. This project integrates SigNoz to collect telemetry data from various services including:

- **Traces**: Distributed tracing for request flows
- **Metrics**: Performance and system metrics
- **Logs**: Application and system logs

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │    │   Envoy Proxy  │    │   Node.js API   │
│   (Frontend)    │───▶│   (Port 8080)  │───▶│   (Port 3000)   │
└─────────────────┘    │  JWT Auth +     │    │   (No Telemetry)│
                       │  Telemetry      │    └─────────────────┘
                       │  Collection     │
                       └─────────────────┘
                                │
                                ▼ (Traces, Logs, Metrics)
                       ┌─────────────────┐
                       │ OTEL Collector  │
                       │ (Port 4317/4318)│
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   ClickHouse    │
                       │   (Database)    │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   ZooKeeper     │
                       │  (Coordination) │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   SigNoz UI    │
                       │  (Port 9090)   │
                       └─────────────────┘
```

## Services Overview

### Core SigNoz Services

#### 1. **SigNoz Backend** (`signoz`)

- **Image**: `signoz/signoz:v0.96.1`
- **Port**: `9090:8080`
- **Purpose**: Main SigNoz application providing the UI and API
- **Configuration**:
  - Uses ClickHouse as telemetry store
  - SQLite for application data
  - Prometheus configuration for metrics
- **Environment Variables**:
  - `SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN=tcp://pzero-clickhouse:9000`
  - `SIGNOZ_SQLSTORE_SQLITE_PATH=/var/lib/signoz/signoz.db`
  - `STORAGE=clickhouse`

#### 2. **OTEL Collector** (`otel-collector`)

- **Image**: `signoz/signoz-otel-collector:v0.129.6`
- **Ports**: `4317:4317` (gRPC), `4318:4318` (HTTP)
- **Purpose**: Collects, processes, and exports telemetry data
- **Features**:
  - OTLP receivers for traces, metrics, and logs
  - Batch processing for efficient data handling
  - Resource detection for metadata
  - Span metrics generation

#### 3. **ClickHouse Database** (`clickhouse`)

- **Image**: `clickhouse/clickhouse-server:25.5.6`
- **Purpose**: High-performance columnar database for telemetry storage
- **Databases**:
  - `signoz_traces`: Distributed tracing data
  - `signoz_metrics`: Metrics data
  - `signoz_logs`: Log data
  - `signoz_metadata`: Metadata and schema information
- **Features**:
  - Prometheus metrics endpoint on port 9363
  - Custom histogram quantile function
  - Optimized for time-series data

#### 4. **ZooKeeper** (`zookeeper-1`)

- **Image**: `signoz/zookeeper:3.7.1`
- **Purpose**: Coordination service for ClickHouse clustering
- **Features**:
  - Prometheus metrics on port 9141
  - Auto-purge configuration
  - Anonymous login enabled

#### 5. **Schema Migrators**

- **Sync Migrator**: `schema-migrator-sync`
- **Async Migrator**: `schema-migrator-async`
- **Purpose**: Database schema management and migrations

### Application Services

#### 6. **Envoy Proxy** (`envoy`)

- **Image**: `envoyproxy/envoy:v1.30-latest`
- **Ports**: `8080:8080` (external), `9901:9901` (admin)
- **Purpose**: Edge proxy with JWT authentication and comprehensive telemetry collection
- **Features**:
  - JWT authentication enforcement
  - CORS handling
  - OpenTelemetry tracing integration (sends traces to OTEL collector)
  - Access logging (sends logs to OTEL collector)
  - Stats/metrics collection (sends metrics to OTEL collector)
  - Request routing to backend services

#### 7. **Node.js Server** (`server`)

- **Custom Build**: Built from `./packages/server/Dockerfile`
- **Port**: `3000:8080`
- **Purpose**: Backend API server (no direct telemetry instrumentation)
- **Technology Stack**:
  - Fastify web framework
  - SQLite database
  - JWT authentication
  - OAuth2 integration
- **Note**: All telemetry data is collected by Envoy proxy, not directly from this service

## SigNoz Components

### Data Collection

#### Receivers

- **OTLP gRPC**: Port 4317 for high-performance data ingestion
- **OTLP HTTP**: Port 4318 for HTTP-based data ingestion
- **Prometheus**: Scraping metrics from various services

#### Processors

- **Batch Processor**: Efficiently batches data before export
- **Resource Detection**: Adds host and system metadata
- **Span Metrics**: Generates metrics from trace spans

#### Exporters

- **ClickHouse Traces**: Exports traces to `signoz_traces` database
- **ClickHouse Metrics**: Exports metrics to `signoz_metrics` database
- **ClickHouse Logs**: Exports logs to `signoz_logs` database

### Data Storage

#### ClickHouse Databases

1. **signoz_traces**: Stores distributed tracing data
2. **signoz_metrics**: Stores metrics and time-series data
3. **signoz_logs**: Stores log data
4. **signoz_metadata**: Stores metadata and schema information
5. **signoz_meter**: Stores meter data for metrics

### Monitoring Capabilities

#### Traces

- Distributed tracing across services
- Request flow visualization
- Performance bottleneck identification
- Error tracking and debugging

#### Metrics

- System performance metrics
- Application metrics
- Custom business metrics
- Prometheus-compatible metrics

#### Logs

- Centralized log collection
- Log aggregation and analysis
- Error log tracking
- Access log monitoring

## Data Flow

### 1. **Trace Collection**

```
Client Request → Envoy Proxy → Node.js Server
                     ↓
              OTEL Collector (Envoy Tracing)
                     ↓
              ClickHouse (signoz_traces)
                     ↓
              SigNoz UI (Trace Visualization)
```

### 2. **Metrics Collection**

```
Envoy Proxy → OTEL Collector (Envoy Stats)
    ↓              ↓
System Metrics → ClickHouse → SigNoz UI
```

### 3. **Log Collection**

```
Envoy Access Logs → OTEL Collector → ClickHouse (signoz_logs)
                                      ↓
                                 SigNoz UI (Log Analysis)
```

## Configuration Files

### Key Configuration Files

1. **`docker-compose.yml`**: Main orchestration file
2. **`otel-collector-config.yaml`**: OTEL collector configuration
3. **`envoy.yaml`**: Envoy proxy configuration with JWT auth
4. **`common/clickhouse/config.xml`**: ClickHouse server configuration
5. **`common/signoz/prometheus.yml`**: Prometheus configuration

### Environment Variables

#### SigNoz Backend

```bash
SIGNOZ_TELEMETRYSTORE_CLICKHOUSE_DSN=tcp://pzero-clickhouse:9000
SIGNOZ_SQLSTORE_SQLITE_PATH=/var/lib/signoz/signoz.db
STORAGE=clickhouse
TELEMETRY_ENABLED=true
DOT_METRICS_ENABLED=true
```

#### OTEL Collector

```bash
OTEL_RESOURCE_ATTRIBUTES=host.name=signoz-host,os.type=linux
LOW_CARDINAL_EXCEPTION_GROUPING=false
```

## Monitoring & Observability

### Available Endpoints

- **SigNoz UI**: http://localhost:9090
- **Envoy Admin**: http://localhost:9901
- **ClickHouse HTTP**: http://localhost:8123
- **ClickHouse Metrics**: http://localhost:9363/metrics
- **ZooKeeper Metrics**: http://localhost:9141/metrics

### Health Checks

All services include health check configurations:

- **SigNoz**: `/api/v1/health`
- **ClickHouse**: `/ping`
- **ZooKeeper**: `/commands/ruok`

### Metrics Collection

#### Prometheus Scraping

- **OTEL Collector**: `localhost:8888`
- **ClickHouse**: `localhost:9363/metrics`
- **ZooKeeper**: `localhost:9141/metrics`

#### Custom Metrics

- Application-specific metrics
- Business metrics
- Performance metrics
- Error rates and latencies

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Ports 8080, 9090, 4317, 4318 available

### Quick Start

1. **Start all services**:

   ```bash
   docker-compose up -d
   ```

2. **Verify services are running**:

   ```bash
   docker-compose ps
   ```

3. **Access SigNoz UI**:

   - Open http://localhost:9090 in your browser

4. **Check service logs**:
   ```bash
   docker-compose logs pzero-signoz
   docker-compose logs pzero-otel-collector
   docker-compose logs pzero-clickhouse
   ```

### Testing Telemetry Collection

1. **Send test traces**:

   ```bash
   curl -X POST http://localhost:4318/v1/traces \
     -H "Content-Type: application/json" \
     -d '{"resourceSpans":[]}'
   ```

2. **Send test metrics**:

   ```bash
   curl -X POST http://localhost:4318/v1/metrics \
     -H "Content-Type: application/json" \
     -d '{"resourceMetrics":[]}'
   ```

3. **Send test logs**:
   ```bash
   curl -X POST http://localhost:4318/v1/logs \
     -H "Content-Type: application/json" \
     -d '{"resourceLogs":[]}'
   ```

## Troubleshooting

### Common Issues

#### 1. **Services Not Starting**

```bash
# Check logs
docker-compose logs [service-name]

# Check port conflicts
lsof -i :8080
lsof -i :9090
```

#### 2. **ClickHouse Connection Issues**

```bash
# Test ClickHouse connectivity
docker-compose exec pzero-clickhouse clickhouse-client --query "SELECT 1"

# Check ClickHouse logs
docker-compose logs pzero-clickhouse
```

#### 3. **OTEL Collector Issues**

```bash
# Check collector configuration
docker-compose exec pzero-otel-collector cat /etc/otel-collector-config.yaml

# Test collector endpoints
curl http://localhost:4318/v1/traces
```

#### 4. **SigNoz UI Not Loading**

```bash
# Check SigNoz health
curl http://localhost:9090/api/v1/health

# Check SigNoz logs
docker-compose logs pzero-signoz
```

### Performance Tuning

#### ClickHouse Optimization

- Adjust `max_memory_usage` in ClickHouse config
- Configure appropriate `max_concurrent_queries`
- Optimize batch sizes in OTEL collector

#### OTEL Collector Tuning

- Adjust `send_batch_size` and `send_batch_max_size`
- Configure appropriate `timeout` values
- Optimize processor configurations

### Data Retention

#### ClickHouse TTL Configuration

- Configure TTL policies for different data types
- Set appropriate retention periods
- Monitor disk usage

#### Log Rotation

- Configure log rotation in Docker Compose
- Set appropriate log size limits
- Monitor log volume

## Advanced Configuration

### Custom Dashboards

- Create custom dashboards in SigNoz UI
- Configure alerts and notifications
- Set up custom metrics

### Security Considerations

- Configure authentication for SigNoz UI
- Set up TLS for external access
- Implement proper access controls

### Scaling Considerations

- Configure ClickHouse clustering
- Set up multiple OTEL collector instances
- Implement load balancing for high availability

## Integration with Application

### Instrumentation

The application telemetry is collected entirely by Envoy proxy:

1. **Envoy Proxy**: Automatically collects traces, metrics, and logs from all requests
2. **Node.js Server**: No direct instrumentation - all telemetry comes through Envoy
3. **Telemetry Sources**:
   - **Traces**: Request tracing through Envoy's OpenTelemetry integration
   - **Logs**: Access logs from Envoy proxy
   - **Metrics**: Stats and performance metrics from Envoy

### JWT Authentication Flow

```
Client → Envoy Proxy (JWT Validation + Telemetry Collection) → Node.js Server
   ↓                           ↓
Traces/Metrics/Logs → OTEL Collector → ClickHouse → SigNoz UI
```

This setup provides comprehensive observability for the entire application stack, with all telemetry data collected by Envoy proxy and centralized monitoring and analysis capabilities through SigNoz.
