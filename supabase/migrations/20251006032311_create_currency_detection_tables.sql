/*
  # Currency Detection System Tables

  ## Overview
  This migration creates the database schema for IP-based automatic currency detection
  with caching and rate limiting capabilities.

  ## New Tables

  ### 1. `user_sessions`
  Stores IP address to currency mappings for caching purposes.
  - `id` (uuid, primary key) - Unique identifier for each session
  - `ip_address` (text, indexed) - User's IP address (anonymized for privacy)
  - `currency_code` (text) - Detected currency code (USD, EUR, GBP, etc.)
  - `country_code` (text) - Detected country code (US, GB, AU, etc.)
  - `country_name` (text) - Full country name
  - `created_at` (timestamptz) - When the session was created
  - `last_accessed` (timestamptz) - Last time this session was accessed
  - `expires_at` (timestamptz, indexed) - When this cache entry expires (24 hours)

  ### 2. `currency_detection_logs`
  Logs all currency detection attempts for monitoring and analytics.
  - `id` (uuid, primary key) - Unique identifier for each log entry
  - `ip_address` (text) - User's IP address (anonymized)
  - `detected_currency` (text) - Currency that was detected
  - `detection_method` (text) - Method used (cache, api, fallback)
  - `api_provider` (text) - Which API was used (ipapi, ip-api, etc.)
  - `success` (boolean) - Whether detection was successful
  - `error_message` (text) - Error message if detection failed
  - `response_time_ms` (integer) - How long the detection took
  - `created_at` (timestamptz, indexed) - When the detection occurred

  ### 3. `rate_limit_counters`
  Tracks API call rate limits per IP address to prevent abuse.
  - `id` (uuid, primary key) - Unique identifier
  - `ip_address` (text, indexed) - User's IP address
  - `request_count` (integer) - Number of requests in current window
  - `window_start` (timestamptz) - Start of the current rate limit window
  - `created_at` (timestamptz) - When the counter was created
  - `updated_at` (timestamptz) - Last time the counter was updated

  ## Security
  - Enable RLS on all tables
  - Allow anonymous read access to `user_sessions` for caching lookups
  - Allow anonymous write access to `user_sessions` for cache updates
  - Allow anonymous write access to `currency_detection_logs` for logging
  - Allow anonymous read/write access to `rate_limit_counters` for rate limiting

  ## Indexes
  - Index on `user_sessions.ip_address` for fast cache lookups
  - Index on `user_sessions.expires_at` for efficient cleanup
  - Index on `currency_detection_logs.created_at` for analytics queries
  - Index on `rate_limit_counters.ip_address` for fast rate limit checks

  ## Notes
  - IP addresses should be anonymized/hashed before storage for privacy
  - Cache entries expire after 24 hours
  - Rate limit window is 1 hour with 10 requests maximum per IP
  - Logs are kept for 30 days for analytics
*/

-- Create user_sessions table for caching IP to currency mappings
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  currency_code text NOT NULL,
  country_code text,
  country_name text,
  created_at timestamptz DEFAULT now(),
  last_accessed timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create index on ip_address for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_address ON user_sessions(ip_address);

-- Create index on expires_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read from cache
CREATE POLICY "Allow anonymous read access to user_sessions"
  ON user_sessions
  FOR SELECT
  TO anon
  USING (expires_at > now());

-- Allow anonymous users to insert new cache entries
CREATE POLICY "Allow anonymous insert to user_sessions"
  ON user_sessions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update cache entries
CREATE POLICY "Allow anonymous update to user_sessions"
  ON user_sessions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create currency_detection_logs table for monitoring
CREATE TABLE IF NOT EXISTS currency_detection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  detected_currency text,
  detection_method text NOT NULL,
  api_provider text,
  success boolean DEFAULT true,
  error_message text,
  response_time_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Create index on created_at for analytics queries
CREATE INDEX IF NOT EXISTS idx_currency_logs_created_at ON currency_detection_logs(created_at);

-- Enable RLS on currency_detection_logs
ALTER TABLE currency_detection_logs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert logs
CREATE POLICY "Allow anonymous insert to currency_detection_logs"
  ON currency_detection_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create rate_limit_counters table for rate limiting
CREATE TABLE IF NOT EXISTS rate_limit_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  request_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on ip_address for fast rate limit checks
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_address ON rate_limit_counters(ip_address);

-- Enable RLS on rate_limit_counters
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read rate limit counters
CREATE POLICY "Allow anonymous read to rate_limit_counters"
  ON rate_limit_counters
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to insert rate limit counters
CREATE POLICY "Allow anonymous insert to rate_limit_counters"
  ON rate_limit_counters
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update rate limit counters
CREATE POLICY "Allow anonymous update to rate_limit_counters"
  ON rate_limit_counters
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_sessions WHERE expires_at < now();
END;
$$;

-- Function to clean up old logs (keep only last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM currency_detection_logs WHERE created_at < now() - interval '30 days';
END;
$$;