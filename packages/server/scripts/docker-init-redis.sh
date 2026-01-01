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

echo "Waiting for Redis to be ready..."
until redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} $REDIS_AUTH_ARG ping > /dev/null 2>&1; do
  echo "Redis is unavailable - sleeping"
  sleep 1
done

echo "Redis is ready!"

# Check if data already exists
EXISTS=$(redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} $REDIS_AUTH_ARG exists active_sessions:index)

if [ "$EXISTS" = "0" ]; then
  echo "Initializing Redis data structures..."
  node /app/packages/server/scripts/init-redis.js
  echo "Redis initialization complete!"
else
  echo "Redis data already exists, skipping initialization"
fi

# Continue with the main application
exec "$@"