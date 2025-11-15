# Docker Compose Setup for Fastify

## Quick Start Commands

### 🚀 **Standard Setup (Fastify + Database)**
```bash
# Start the full stack
docker-compose -f docker-compose.fastify.yaml up --build

# Check logs
docker-compose -f docker-compose.fastify.yaml logs -f pzero-fastify

# Test the API
curl http://localhost:8090/health
curl -H "x-custom-auth: secret-value-123" http://localhost:8090/api/test
```

### ⚡ **With Envoy (Maximum Performance)**
```bash
# Build Wasm filter first
cd wasm-filter && pnpm install && pnpm build && cd ..

# Start Fastify + Envoy + Database
docker-compose -f docker-compose.fastify.yaml --profile envoy up --build

# Test through Envoy proxy
curl http://localhost:8181/health
curl -H "x-custom-auth: secret-value-123" http://localhost:8181/api/test

# Check Envoy admin
curl http://localhost:9901/stats/prometheus
```

### 🛠️ **Development Mode**
```bash
# Start with hot reload
docker-compose -f docker-compose.fastify.yaml --profile dev up

# Fastify will restart automatically on file changes
# Available on http://localhost:8091
```

## Service Profiles

Use different profiles for different scenarios:

```bash
# Basic stack (Fastify + DB + Redis)
docker-compose -f docker-compose.fastify.yaml up

# With Envoy proxy
docker-compose -f docker-compose.fastify.yaml --profile envoy up

# Development mode with hot reload
docker-compose -f docker-compose.fastify.yaml --profile dev up

# Include load testing tools
docker-compose -f docker-compose.fastify.yaml --profile testing up

# Everything (dev + envoy + testing)
docker-compose -f docker-compose.fastify.yaml --profile envoy --profile dev --profile testing up
```

## Environment Configuration

### `.env` file setup:
```bash
# Copy the example
cp .env.example .env

# Edit for your needs
NODE_ENV=production
FASTIFY_PORT=8090
ENVOY_PORT=8181
LOG_LEVEL=info

# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=pzero

# Performance tuning
MAX_REQUESTS_PER_MINUTE=1000
TOKEN_CACHE_TTL=300000

# Security
JWT_SECRET=your_super_secure_jwt_secret
COOKIE_SECRET=your_cookie_secret
```

## Container Architecture

```
┌─────────────────────────────────────────┐
│              Docker Network             │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │    Envoy    │  │     Fastify     │   │
│  │   :8181     │─▶│      :8090      │   │
│  │ (optional)  │  │   (main app)    │   │
│  └─────────────┘  └─────────────────┘   │
│         │                   │           │
│         │          ┌─────────────────┐   │
│         │          │   PostgreSQL    │   │
│         │          │      :5432      │   │
│         │          └─────────────────┘   │
│         │                   │           │
│         │          ┌─────────────────┐   │
│         └─────────▶│      Redis      │   │
│                    │      :6379      │   │
│                    └─────────────────┘   │
└─────────────────────────────────────────┘
```

## Performance Monitoring

### Health Checks
```bash
# Check all services health
docker-compose -f docker-compose.fastify.yaml ps

# Detailed health status
curl http://localhost:8090/health | jq
curl http://localhost:9901/ready  # Envoy (if running)
```

### Logs and Monitoring
```bash
# Follow Fastify logs
docker logs -f pzero-fastify

# Follow all services
docker-compose -f docker-compose.fastify.yaml logs -f

# Check resource usage
docker stats pzero-fastify pzero-postgres pzero-redis
```

### Performance Metrics
```bash
# Fastify metrics
curl http://localhost:8090/metrics | jq

# Envoy metrics (if running)
curl http://localhost:9901/stats/prometheus

# PostgreSQL stats
docker exec pzero-postgres psql -U postgres -d pzero -c "SELECT * FROM pg_stat_activity;"
```

## Load Testing

### Using Built-in Load Tester
```bash
# Start with testing profile
docker-compose -f docker-compose.fastify.yaml --profile testing up -d

# Run load test
docker exec -it pzero-load-tester wrk -t4 -c50 -d30s http://pzero-fastify:8090/health

# Test with authentication
docker exec -it pzero-load-tester wrk -t4 -c50 -d30s -H "x-custom-auth: secret-value-123" http://pzero-fastify:8090/api/test
```

### External Load Testing
```bash
# Using wrk (install with: brew install wrk)
wrk -t4 -c100 -d30s http://localhost:8090/health
wrk -t4 -c100 -d30s -H "x-custom-auth: secret-value-123" http://localhost:8090/api/test

# Using ab (Apache Bench)
ab -n 10000 -c 100 http://localhost:8090/health
ab -n 10000 -c 100 -H "x-custom-auth: secret-value-123" http://localhost:8090/api/test
```

## Development Workflow

### 🔄 **Hot Reload Development**
```bash
# Start development environment
docker-compose -f docker-compose.fastify.yaml --profile dev up

# Code changes in src/ will automatically restart Fastify
# Available on http://localhost:8091 (different port to avoid conflicts)
```

### 🧪 **Testing Different Configurations**
```bash
# Test Fastify only
docker-compose -f docker-compose.fastify.yaml up pzero-fastify postgres redis

# Test with Envoy
docker-compose -f docker-compose.fastify.yaml --profile envoy up

# Compare performance
curl -w "@curl-format.txt" -H "x-custom-auth: secret-value-123" http://localhost:8090/api/test  # Fastify
curl -w "@curl-format.txt" -H "x-custom-auth: secret-value-123" http://localhost:8181/api/test  # Envoy
```

## Production Deployment

### 🔒 **Security Hardening**
```bash
# Use production environment
NODE_ENV=production docker-compose -f docker-compose.fastify.yaml up

# Enable security features in .env:
JWT_SECRET=your_very_secure_jwt_secret_here
COOKIE_SECRET=your_very_secure_cookie_secret_here
POSTGRES_PASSWORD=your_very_secure_db_password_here

# Consider using Docker secrets in production
```

### 📊 **Resource Limits**
Add to `docker-compose.fastify.yaml`:
```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

## Troubleshooting

### Common Issues

#### Port Conflicts
```bash
# Check what's using ports
lsof -i :8090
lsof -i :8181

# Stop conflicting services
docker-compose -f docker-compose.fastify.yaml down
```

#### Database Connection Issues
```bash
# Check PostgreSQL logs
docker logs pzero-postgres

# Test database connection
docker exec -it pzero-postgres psql -U postgres -d pzero -c "SELECT version();"
```

#### Redis Connection Issues
```bash
# Check Redis logs
docker logs pzero-redis

# Test Redis connection
docker exec -it pzero-redis redis-cli ping
```

#### Fastify Won't Start
```bash
# Check Fastify logs
docker logs pzero-fastify

# Check environment variables
docker exec pzero-fastify env | grep -E "(NODE_ENV|PORT|POSTGRES|REDIS)"

# Restart with fresh build
docker-compose -f docker-compose.fastify.yaml down
docker-compose -f docker-compose.fastify.yaml up --build
```

## Backup and Maintenance

### Database Backup
```bash
# Backup PostgreSQL
docker exec pzero-postgres pg_dump -U postgres pzero > backup.sql

# Restore PostgreSQL
docker exec -i pzero-postgres psql -U postgres pzero < backup.sql
```

### Redis Backup
```bash
# Backup Redis
docker exec pzero-redis redis-cli BGSAVE
docker cp pzero-redis:/data/dump.rdb ./redis-backup.rdb
```

### Log Management
```bash
# Rotate logs (add to cron)
docker-compose -f docker-compose.fastify.yaml logs --no-log-prefix > app-$(date +%Y%m%d).log
docker-compose -f docker-compose.fastify.yaml restart pzero-fastify
```

## Useful Commands

```bash
# Quick health check all services
docker-compose -f docker-compose.fastify.yaml ps

# Restart specific service
docker-compose -f docker-compose.fastify.yaml restart pzero-fastify

# View resource usage
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Clean up everything
docker-compose -f docker-compose.fastify.yaml down -v
docker system prune -f

# Scale Fastify (load balancing)
docker-compose -f docker-compose.fastify.yaml up --scale pzero-fastify=3
```

This Docker Compose setup gives you a production-ready Fastify application with optional Envoy proxy, full observability, and easy development workflow!