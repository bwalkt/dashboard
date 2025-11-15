-- Create tables for async logging from Envoy

-- Auth logs table
CREATE TABLE IF NOT EXISTS auth_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip INET,
  path TEXT,
  method VARCHAR(10),
  token_prefix VARCHAR(50),
  status VARCHAR(20),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Request logs table
CREATE TABLE IF NOT EXISTS request_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip INET,
  duration_ms INTEGER,
  status_code INTEGER,
  auth_status VARCHAR(20),
  user_agent TEXT,
  path TEXT,
  method VARCHAR(10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated statistics table
CREATE TABLE IF NOT EXISTS auth_statistics (
  hour TIMESTAMPTZ PRIMARY KEY,
  total_requests INTEGER DEFAULT 0,
  successful_auths INTEGER DEFAULT 0,
  failed_auths INTEGER DEFAULT 0,
  avg_duration_ms NUMERIC(10,2),
  unique_ips INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limit violations
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  client_ip INET NOT NULL,
  request_count INTEGER,
  window_start TIMESTAMPTZ,
  blocked BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_auth_logs_timestamp ON auth_logs(timestamp DESC);
CREATE INDEX idx_auth_logs_client_ip ON auth_logs(client_ip);
CREATE INDEX idx_auth_logs_status ON auth_logs(status);

CREATE INDEX idx_request_logs_timestamp ON request_logs(timestamp DESC);
CREATE INDEX idx_request_logs_client_ip ON request_logs(client_ip);
CREATE INDEX idx_request_logs_auth_status ON request_logs(auth_status);

CREATE INDEX idx_rate_limit_violations_client_ip ON rate_limit_violations(client_ip);
CREATE INDEX idx_rate_limit_violations_timestamp ON rate_limit_violations(timestamp DESC);

-- Partition by month for large datasets (optional)
-- CREATE TABLE auth_logs_2024_01 PARTITION OF auth_logs
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Function to clean old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs() 
RETURNS void AS $$
BEGIN
  -- Delete logs older than 30 days
  DELETE FROM auth_logs WHERE timestamp < NOW() - INTERVAL '30 days';
  DELETE FROM request_logs WHERE timestamp < NOW() - INTERVAL '30 days';
  DELETE FROM rate_limit_violations WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-logs', '0 2 * * *', 'SELECT cleanup_old_logs();');