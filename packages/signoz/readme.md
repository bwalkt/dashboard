# SigNoz Setup Guide

This guide explains how to set up and use SigNoz for observability, including traces, metrics, and logs.

## Prerequisites

- Docker and Docker Compose installed on your system
- At least 4GB of available RAM (recommended: 8GB+)

## 1. Starting SigNoz

To start all SigNoz services, navigate to this directory and run:

```bash
cd packages/signoz
docker compose up -d
```

This will start the following services:
- **SigNoz UI** (dashboard) - accessible on port `3301`
- **OTEL Collector** - HTTP receiver on port `4318`, gRPC receiver on port `4317`
- **ClickHouse** - database for storing traces, metrics, and logs
- **ZooKeeper** - coordination service for ClickHouse
- **Schema Migrators** - for database schema management

### Checking Service Status

To verify all services are running:

```bash
docker compose ps
```

All services should show as "Up" or "healthy". Wait a few minutes after starting for all services to fully initialize.

### Viewing Logs

To view logs from all services:

```bash
docker compose logs -f
```

To view logs from a specific service:

```bash
docker compose logs -f signoz
docker compose logs -f otel-collector
```

### Stopping SigNoz

To stop all services:

```bash
docker compose down
```

To stop and remove all volumes (⚠️ **WARNING**: This will delete all stored data):

```bash
docker compose down -v
```

## 2. Using OTEL HTTP Collector (localhost:4318)

The OTEL Collector is configured to receive telemetry data via HTTP on port `4318`. You can send traces, metrics, and logs to this endpoint.

### Endpoint URLs

- **Traces**: `http://localhost:4318/v1/traces`
- **Metrics**: `http://localhost:4318/v1/metrics`
- **Logs**: `http://localhost:4318/v1/logs`

## 3. Accessing SigNoz Dashboard and Trace Explorer

### Dashboard Access

Once SigNoz is running, access the dashboard at:

**URL**: http://localhost:3301

The dashboard provides:
- **Service Map** - Visual representation of your services and their dependencies
- **Traces** - Detailed trace explorer with filtering and search capabilities
- **Metrics** - Pre-built and custom metrics dashboards
- **Logs** - Centralized log aggregation and search

### Trace Explorer

To access the Trace Explorer:

1. Open http://localhost:3301 in your browser
2. Click on **"Traces"** in the left navigation menu
3. Use the filters to search for traces by:
   - Service name
   - Operation name
   - Duration
   - Tags/Attributes
   - Trace ID (if you have one)

### Key Features

- **Service Map**: View all services and their interconnections
- **Trace Details**: Click on any trace to see detailed span information
- **Filtering**: Filter traces by service, operation, duration, and custom attributes
- **Search**: Search traces by trace ID or other attributes
- **Metrics**: View service-level metrics like request rate, error rate, and latency

### Default Credentials

SigNoz runs without authentication by default in this setup. If you need to add authentication, refer to the [SigNoz documentation](https://signoz.io/docs/).

## Troubleshooting

### Services Not Starting

If services fail to start:

1. Check available disk space: `df -h`
2. Check available memory: `docker stats`
3. Review logs: `docker compose logs [service-name]`

### Collector Not Receiving Data

1. Verify the collector is running: `docker compose ps otel-collector`
2. Check collector logs: `docker compose logs otel-collector`
3. Verify the endpoint is accessible: `curl http://localhost:4318/v1/traces` (should return an error about missing data, not connection refused)

### Dashboard Not Loading

1. Wait 2-3 minutes after starting services for full initialization
2. Check Signoz logs: `docker compose logs signoz`
3. Verify the service is healthy: `curl http://localhost:3301/api/v1/health`

## Additional Resources

- [SigNoz Documentation](https://signoz.io/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [OTEL Collector Configuration](https://opentelemetry.io/docs/collector/configuration/)
