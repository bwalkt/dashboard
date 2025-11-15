# Setup Guide: Envoy vs No-Envoy

## Quick Start Commands

### Option 1: No-Envoy (Simple, Fast Start) 🚀
```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Build the application
pnpm build

# Start without Envoy
pnpm start:no-envoy
```

### Option 2: With Envoy (Full Features) ⚡
```bash
# Install dependencies
pnpm install

# Build Wasm filter
cd wasm-filter && pnpm install && pnpm build && cd ..

# Copy environment file and enable Envoy
cp .env.example .env
# Edit .env: set USE_ENVOY=true

# Start with Docker Compose
docker-compose --profile full up --build
```

## Development Workflows

### 🛠️ Development Mode

#### No-Envoy Development
```bash
# Start development server (hot reload)
pnpm dev

# Test endpoints
curl http://localhost:8090/health
curl -H "x-custom-auth: secret-value-123" http://localhost:8090/api/test
```

#### With-Envoy Development
```bash
# Start all services in development
pnpm dev:envoy

# Test through Envoy proxy
curl http://localhost:8181/health
curl -H "x-custom-auth: secret-value-123" http://localhost:8181/api/test

# Monitor Envoy admin interface
open http://localhost:9901
```

### 🧪 Testing Both Setups

```bash
# Run benchmark comparison
pnpm benchmark

# Start specific configurations
pnpm start:no-envoy    # Node.js only on :8090
pnpm start:envoy       # Envoy + Node.js on :8181
```

## Configuration Options

### Environment Variables

```bash
# .env file configuration

# Choose your architecture
USE_ENVOY=false                    # true = Envoy setup, false = Node.js only
ENABLE_HEADER_VALIDATION=true      # Enable/disable validation middleware

# Port configuration
PORT=8090                          # Node.js server port
ENVOY_PORT=8181                   # Envoy proxy port (if enabled)
ENVOY_ADMIN_PORT=9901             # Envoy admin interface

# Performance tuning
MAX_REQUESTS_PER_MINUTE=100       # Rate limiting
TOKEN_CACHE_TTL=300000            # Cache TTL in milliseconds
```

### Conditional Validation

The header validation can be toggled:

```typescript
// In app-without-envoy.ts
const useHeaderValidation = process.env.ENABLE_HEADER_VALIDATION !== 'false';
if (useHeaderValidation) {
  app.use(headerValidator.validate());
}
```

## Docker Compose Profiles

Use different profiles for different setups:

```bash
# Server only (no Envoy)
docker-compose --profile server up

# Envoy + Server (full stack)  
docker-compose --profile full up

# Include load testing tools
docker-compose --profile full --profile testing up
```

## Package.json Scripts (for pnpm)

```json
{
  "scripts": {
    "dev": "ts-node src/app-without-envoy.ts",
    "dev:envoy": "docker-compose up --build",
    "build": "tsc && pnpm run build:wasm",
    "build:wasm": "cd wasm-filter && pnpm install && pnpm build",
    "start:no-envoy": "NODE_ENV=production ENABLE_HEADER_VALIDATION=true node dist/app-without-envoy.js",
    "start:envoy": "docker-compose --profile full up",
    "benchmark": "chmod +x benchmark.sh && ./benchmark.sh",
    "test": "pnpm test:no-envoy && pnpm test:envoy"
  }
}
```

## Migration Path

### Week 1: Start Simple
```bash
# Begin with no-Envoy for rapid development
USE_ENVOY=false
ENABLE_HEADER_VALIDATION=true
pnpm start:no-envoy
```

### Week 2-3: Add Envoy in Parallel  
```bash
# Build Wasm components
pnpm build:wasm

# Test both setups side by side
pnpm start:no-envoy     # Terminal 1 - port 8090
pnpm start:envoy        # Terminal 2 - port 8181

# Compare performance
pnpm benchmark
```

### Week 4: Choose Final Architecture
Based on benchmark results:
- **High traffic**: Keep Envoy
- **Simple app**: Use no-Envoy
- **Microservices**: Definitely Envoy

## Troubleshooting

### Common Issues

#### Ports Already in Use
```bash
# Check what's using ports
lsof -i :8090
lsof -i :8181

# Kill processes
kill $(lsof -t -i:8090)
```

#### Wasm Build Fails
```bash
# Install AssemblyScript tools
cd wasm-filter
pnpm install assemblyscript
pnpm build
```

#### Docker Issues
```bash
# Clean Docker state
docker-compose down -v
docker system prune -f
docker-compose --profile full up --build
```

#### Environment Variables Not Loading
```bash
# Ensure .env file exists
cp .env.example .env

# Check file contents
cat .env | grep USE_ENVOY
```

## Performance Monitoring

### No-Envoy Monitoring
```bash
# Check server metrics
curl http://localhost:8090/metrics

# Monitor resource usage
htop
```

### Envoy Monitoring
```bash
# Envoy admin interface
open http://localhost:9901

# Envoy metrics
curl http://localhost:9901/stats/prometheus

# Check cluster health
curl http://localhost:9901/clusters
```

## Testing Commands

```bash
# Health checks
curl http://localhost:8090/health      # No-Envoy
curl http://localhost:8181/health      # With-Envoy

# Authentication tests
curl -H "x-custom-auth: secret-value-123" http://localhost:8090/api/test
curl -H "x-custom-auth: invalid-token" http://localhost:8090/api/test

# Rate limiting tests
for i in {1..105}; do curl http://localhost:8090/api/test; done

# Load testing
pnpm benchmark
```

This setup gives you maximum flexibility to compare both approaches and choose the best one for your needs!