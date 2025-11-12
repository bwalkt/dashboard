#!/bin/bash
set -e

# Function to ensure database exists after PostgreSQL starts
# This runs in the background after PostgreSQL has started
ensure_database() {
  local db_name="${POSTGRES_DB:-pzero}"
  local db_user="${POSTGRES_USER:-postgres}"
  
  # Wait for PostgreSQL to be ready (with timeout)
  echo "[db-init] Waiting for PostgreSQL to be ready..."
  local max_attempts=60
  local attempt=0
  until pg_isready -U "$db_user" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      echo "[db-init] Warning: PostgreSQL did not become ready in time, skipping database creation check"
      return 0
    fi
    sleep 1
  done
  
  # Small additional wait to ensure PostgreSQL is fully ready
  sleep 2
  
  # Check if database exists
  DB_EXISTS=$(psql -U "$db_user" -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name'" 2>/dev/null || echo "")
  
  if [ -z "$DB_EXISTS" ]; then
    echo "[db-init] Database '$db_name' does not exist. Creating it..."
    if psql -U "$db_user" -c "CREATE DATABASE $db_name;" 2>/dev/null; then
      echo "[db-init] Database '$db_name' created successfully."
    else
      echo "[db-init] Warning: Failed to create database (it may have been created by another process or already exists)"
    fi
  else
    echo "[db-init] Database '$db_name' already exists."
  fi
}

# Start the database ensure function in the background
ensure_database &

# Execute the original PostgreSQL entrypoint
# This will handle initialization and then exec into postgres
exec /usr/local/bin/docker-entrypoint.sh "$@"

