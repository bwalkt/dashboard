#!/bin/sh

# Docker Redis Initialization Script
# This script runs when the container starts to populate Redis with initial data

# Extract Redis password from REDIS_URL if present
# NOTE: Passwords with special characters (@, :, /) must be URL-encoded in REDIS_URL
# Example: redis://:my%40pass%3A123@localhost:6379 for password "my@pass:123"
# 
# Security Note: Using -a flag exposes password in process listings.
# For production, consider:
# - Running Redis in isolated networks
# - Using Redis ACLs with limited-privilege users
# - Restricting container access

# Function to run redis-cli with proper authentication
redis_cli() {
  if [ -n "$REDIS_PASSWORD" ]; then
    redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" -a "$REDIS_PASSWORD" "$@"
  else
    redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" "$@"
  fi
}

# Extract and set REDIS_PASSWORD if needed
if [ -n "$REDIS_URL" ]; then
  # Extract password from redis://:password@host:port or redis://username:password@host:port
  # This expects URL-encoded passwords (e.g., %40 for @, %3A for :, %20 for space)
  REDIS_PASSWORD_ENCODED=$(echo "$REDIS_URL" | sed -n 's|.*redis://\([^:]*:\)\?\([^@]*\)@.*|\2|p')
  if [ -n "$REDIS_PASSWORD_ENCODED" ]; then
    # URL-decode using Node.js for proper handling of all percent-encoded characters
    # This correctly handles edge cases like %2540 (literal %40), spaces, and all special chars
    REDIS_PASSWORD=$(node -e "console.log(decodeURIComponent(process.argv[1]))" "$REDIS_PASSWORD_ENCODED" 2>/dev/null)
    if [ $? -ne 0 ]; then
      echo "ERROR: Failed to decode Redis password from REDIS_URL" >&2
      echo "Ensure password is properly URL-encoded in REDIS_URL" >&2
      exit 1
    fi
    export REDIS_PASSWORD
  fi
elif [ -n "$REDIS_PASSWORD" ]; then
  # REDIS_PASSWORD is already set, just export it
  export REDIS_PASSWORD
fi

# Configure timeout for Redis readiness check
MAX_RETRIES=30
RETRY_COUNT=0

echo "Waiting for Redis to be ready..."
until redis_cli ping > /dev/null 2>&1 || [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  echo "Redis is unavailable - sleeping (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
  sleep 1
  RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
  echo "ERROR: Redis failed to become ready after ${MAX_RETRIES} seconds"
  exit 1
fi

echo "Redis is ready!"

# Check if all required data structures exist for better idempotency
# This prevents partial initialization issues if the script failed mid-execution
echo "Checking existing Redis data structures..."

# Check multiple indicators to ensure complete initialization
# The init script creates: active_sessions:index (global), and per-user indexes for funcs/endpoints
ACTIVE_SESSIONS_INDEX=$(redis_cli exists active_sessions:index)
# Check for at least one actual session (the script creates user_001, user_002, user_003)
SESSION_DATA=$(redis_cli exists active_sessions:user_001)
# Check for at least one function data
FUNC_DATA=$(redis_cli exists next_funcs:user_001:1)
# Check for at least one endpoint data  
ENDPOINT_DATA=$(redis_cli exists active_endpoints:endpoint_001)

# Configure path to initialization script
INIT_SCRIPT_PATH=${REDIS_INIT_SCRIPT:-/app/packages/server/scripts/init-redis.js}

# Initialize if any of the expected data structures are missing
if [ "$ACTIVE_SESSIONS_INDEX" = "0" ] || [ "$SESSION_DATA" = "0" ] || [ "$FUNC_DATA" = "0" ] || [ "$ENDPOINT_DATA" = "0" ]; then
  if [ "$ACTIVE_SESSIONS_INDEX" = "1" ] || [ "$SESSION_DATA" = "1" ] || [ "$FUNC_DATA" = "1" ] || [ "$ENDPOINT_DATA" = "1" ]; then
    echo "WARNING: Partial initialization detected. Re-initializing to ensure consistency..."
  fi
  echo "Initializing Redis data structures..."
  if [ -f "$INIT_SCRIPT_PATH" ]; then
    # Pass Redis credentials to the Node script
    export REDIS_HOST=${REDIS_HOST:-localhost}
    export REDIS_PORT=${REDIS_PORT:-6379}
    if [ -n "$REDIS_PASSWORD" ]; then
      export REDIS_PASSWORD
    fi
    
    # Run initialization with error handling
    if node "$INIT_SCRIPT_PATH"; then
      echo "Redis initialization complete!"
    else
      echo "ERROR: Redis initialization failed!" >&2
      echo "The initialization script exited with an error." >&2
      echo "Please check the logs above for details." >&2
      exit 1
    fi
  else
    echo "ERROR: Initialization script not found at $INIT_SCRIPT_PATH" >&2
    echo "Cannot initialize Redis data structures." >&2
    exit 1
  fi
else
  echo "Redis data already exists, skipping initialization"
  echo "Verified presence of: sessions index, session data, function data, and endpoint data"
fi

# Continue with the main application
exec "$@"