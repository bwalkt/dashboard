#!/bin/bash

# Performance benchmark script for Envoy vs No-Envoy

echo "🔥 Performance Benchmark: Envoy vs No-Envoy"
echo "==========================================="

# Test scenarios
SCENARIOS=(
  "no-auth:/health"
  "custom-header:/api/test"
  "protected:/api/protected"
)

# Test both setups
SETUPS=(
  "no-envoy:8090"
  "with-envoy:8181"
)

# Install dependencies if needed
if ! command -v wrk &> /dev/null; then
  echo "⚠️  wrk not found. Install with: brew install wrk (macOS) or apt-get install wrk (Ubuntu)"
  exit 1
fi

# Function to run benchmark
run_benchmark() {
  local setup=$1
  local scenario=$2
  local url=$3
  local headers=$4
  
  echo ""
  echo "📊 Testing: $setup - $scenario"
  echo "URL: $url"
  echo "Headers: $headers"
  echo "---"
  
  if [ -n "$headers" ]; then
    wrk -t4 -c100 -d30s -H "$headers" "$url" --timeout 10s
  else
    wrk -t4 -c100 -d30s "$url" --timeout 10s
  fi
}

# Function to test single request latency
test_latency() {
  local url=$1
  local headers=$2
  local setup=$3
  
  echo "🕐 Latency test: $setup"
  
  for i in {1..10}; do
    if [ -n "$headers" ]; then
      time curl -s -H "$headers" "$url" > /dev/null
    else
      time curl -s "$url" > /dev/null
    fi
  done
}

# Main benchmark loop
for setup in "${SETUPS[@]}"; do
  IFS=':' read -r name port <<< "$setup"
  
  echo ""
  echo "🚀 Starting benchmark for: $name (port $port)"
  
  # Check if service is running
  if ! curl -s "http://localhost:$port/health" > /dev/null; then
    echo "❌ Service not running on port $port. Please start it first."
    continue
  fi
  
  for scenario in "${SCENARIOS[@]}"; do
    IFS=':' read -r test_name endpoint <<< "$scenario"
    
    case $test_name in
      "no-auth")
        run_benchmark "$name" "$test_name" "http://localhost:$port$endpoint" ""
        ;;
      "custom-header")
        run_benchmark "$name" "$test_name" "http://localhost:$port$endpoint" "x-custom-auth: secret-value-123"
        ;;
      "protected")
        # First get auth cookie
        curl -s -c cookies.txt -X POST "http://localhost:$port/auth/login" \
          -H "Content-Type: application/json" \
          -d '{"email":"test@example.com","password":"password"}' > /dev/null
        
        run_benchmark "$name" "$test_name" "http://localhost:$port$endpoint" "Cookie: $(cat cookies.txt | grep accessToken | cut -f6-7)"
        rm -f cookies.txt
        ;;
    esac
    
    sleep 2
  done
done

echo ""
echo "🏁 Benchmark complete!"
echo ""
echo "📈 Analysis Tips:"
echo "- Look at 'Requests/sec' for throughput"
echo "- Look at 'Latency' percentiles for response time"
echo "- Compare 50th, 95th, and 99th percentile latencies"
echo "- Monitor CPU usage during tests with 'top' or 'htop'"
echo ""
echo "🔧 To start services:"
echo "No-Envoy:   npm run start:no-envoy"
echo "With-Envoy: docker-compose up"