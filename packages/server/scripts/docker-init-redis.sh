#!/bin/sh

# Docker Redis Initialization Script
# This script runs when the container starts to populate Redis with initial data

echo "Waiting for Redis to be ready..."
until redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} ping > /dev/null 2>&1; do
  echo "Redis is unavailable - sleeping"
  sleep 1
done

echo "Redis is ready!"

# Check if data already exists
EXISTS=$(redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} exists active_sessions:index)

if [ "$EXISTS" = "0" ]; then
  echo "Initializing Redis data structures..."
  node /app/packages/server/scripts/init-redis.js
  echo "Redis initialization complete!"
else
  echo "Redis data already exists, skipping initialization"
fi

# Continue with the main application
exec "$@"