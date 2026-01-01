#!/bin/sh

# Docker Redis Initialization Script
# This script runs when the container starts to populate Redis with initial data

# Extract Redis password from REDIS_URL if present
REDIS_AUTH_ARG=""
if [ -n "$REDIS_URL" ]; then
  # Extract password from redis://:password@host:port or redis://username:password@host:port
  REDIS_PASSWORD=$(echo "$REDIS_URL" | sed -n 's|.*redis://\([^:]*:\)\?\([^@]*\)@.*|\2|p')
  if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_AUTH_ARG="-a $REDIS_PASSWORD"
  fi
elif [ -n "$REDIS_PASSWORD" ]; then
  # Use REDIS_PASSWORD env var if set directly
  REDIS_AUTH_ARG="-a $REDIS_PASSWORD"
fi

# Configure timeout for Redis readiness check
MAX_RETRIES=30
RETRY_COUNT=0

echo "Waiting for Redis to be ready..."
until redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} $REDIS_AUTH_ARG ping > /dev/null 2>&1 || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  echo "Redis is unavailable - sleeping (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
  sleep 1
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo "ERROR: Redis failed to become ready after ${MAX_RETRIES} seconds"
  exit 1
fi

echo "Redis is ready!"

# Check if data already exists
EXISTS=$(redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} $REDIS_AUTH_ARG exists active_sessions:index)

# Configure path to initialization script
INIT_SCRIPT_PATH=${REDIS_INIT_SCRIPT:-/app/packages/server/scripts/init-redis.js}

if [ "$EXISTS" = "0" ]; then
  echo "Initializing Redis data structures..."
  if [ -f "$INIT_SCRIPT_PATH" ]; then
    node "$INIT_SCRIPT_PATH"
    echo "Redis initialization complete!"
  else
    echo "WARNING: Initialization script not found at $INIT_SCRIPT_PATH"
    echo "Skipping Redis data initialization"
  fi
else
  echo "Redis data already exists, skipping initialization"
fi

# Continue with the main application
exec "$@"