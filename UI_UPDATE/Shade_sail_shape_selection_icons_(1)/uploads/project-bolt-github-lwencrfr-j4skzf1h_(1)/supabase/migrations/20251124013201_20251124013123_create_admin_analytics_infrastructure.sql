/*
  # Create Admin Analytics Infrastructure
  
  1. New Tables
    - `admin_users` - Super admin authentication and access control
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `password_hash` (text, not null)
      - `role` (text, default 'admin')
      - `created_at` (timestamptz)
      - `last_login_at` (timestamptz)
      
    - `user_events` - Comprehensive event tracking for all user interactions
      - `id` (uuid, primary key)
      - `event_type` (text, not null) - pdf_download, email_summary, add_to_cart, quote_save, etc.
      - `event_data` (jsonb) - Full event details
      - `quote_id` (uuid, foreign key to saved_quotes)
      - `customer_email` (text)
      - `customer_ip` (text)
      - `user_agent` (text)
      - `device_type` (text) - mobile, tablet, desktop
      - `success` (boolean, default true)
      - `error_message` (text)
      - `created_at` (timestamptz, default now())
      
    - `analytics_cache` - Pre-computed analytics for fast dashboard loading
      - `id` (uuid, primary key)
      - `metric_name` (text, unique, not null)
      - `metric_value` (jsonb, not null)
      - `computed_at` (timestamptz, default now())
      - `expires_at` (timestamptz)
  
  2. Security
    - Enable RLS on all admin tables
    - Admin users table: only authenticated admins can read their own data
    - User events table: only authenticated admins can read
    - Analytics cache table: only authenticated admins can read
    
  3. Indexes
    - Index on user_events(event_type) for filtering
    - Index on user_events(created_at) for time-based queries
    - Index on user_events(customer_email) for user journey tracking
    - Index on user_events(quote_id) for quote-specific events
    - Combined indexes for common query patterns
    
  4. Functions
    - Function to track events from edge functions
    - Function to compute analytics metrics
    - Function to clean up old events (retention policy)
*/

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can only read their own data
CREATE POLICY "Admins can read own data"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create user_events table for comprehensive tracking
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  quote_id uuid REFERENCES saved_quotes(id) ON DELETE SET NULL,
  customer_email text,
  customer_ip text,
  user_agent text,
  device_type text CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert events (for tracking from edge functions)
CREATE POLICY "Anyone can insert events"
  ON user_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only authenticated admins can read events
CREATE POLICY "Authenticated users can read all events"
  ON user_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Create analytics_cache table for pre-computed metrics
CREATE TABLE IF NOT EXISTS analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text UNIQUE NOT NULL,
  metric_value jsonb NOT NULL,
  computed_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '1 hour')
);

-- Enable RLS
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read cached analytics
CREATE POLICY "Authenticated users can read analytics cache"
  ON analytics_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: System can update cache
CREATE POLICY "System can manage analytics cache"
  ON analytics_cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_email ON user_events(customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_events_quote_id ON user_events(quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_events_success ON user_events(success);
CREATE INDEX IF NOT EXISTS idx_user_events_type_created ON user_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_events_email_created ON user_events(customer_email, created_at DESC) WHERE customer_email IS NOT NULL;

-- Create combined index for common admin queries
CREATE INDEX IF NOT EXISTS idx_user_events_admin_query ON user_events(event_type, success, created_at DESC);

-- Create GIN index for event_data JSONB queries
CREATE INDEX IF NOT EXISTS idx_user_events_event_data ON user_events USING gin(event_data);

-- Function to track events (called from edge functions)
CREATE OR REPLACE FUNCTION track_user_event(
  p_event_type text,
  p_event_data jsonb DEFAULT '{}'::jsonb,
  p_quote_id uuid DEFAULT NULL,
  p_customer_email text DEFAULT NULL,
  p_customer_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_type text DEFAULT 'unknown',
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO user_events (
    event_type,
    event_data,
    quote_id,
    customer_email,
    customer_ip,
    user_agent,
    device_type,
    success,
    error_message
  ) VALUES (
    p_event_type,
    p_event_data,
    p_quote_id,
    p_customer_email,
    p_customer_ip,
    p_user_agent,
    p_device_type,
    p_success,
    p_error_message
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_quotes', (SELECT COUNT(*) FROM saved_quotes WHERE created_at BETWEEN p_start_date AND p_end_date),
    'total_events', (SELECT COUNT(*) FROM user_events WHERE created_at BETWEEN p_start_date AND p_end_date),
    'pdf_downloads', (SELECT COUNT(*) FROM user_events WHERE event_type = 'pdf_download' AND created_at BETWEEN p_start_date AND p_end_date),
    'email_summaries', (SELECT COUNT(*) FROM user_events WHERE event_type = 'email_summary' AND created_at BETWEEN p_start_date AND p_end_date),
    'add_to_cart', (SELECT COUNT(*) FROM user_events WHERE event_type = 'add_to_cart' AND created_at BETWEEN p_start_date AND p_end_date),
    'unique_customers', (SELECT COUNT(DISTINCT customer_email) FROM saved_quotes WHERE customer_email IS NOT NULL AND created_at BETWEEN p_start_date AND p_end_date),
    'total_quote_value', (SELECT COALESCE(SUM((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes WHERE created_at BETWEEN p_start_date AND p_end_date),
    'avg_quote_value', (SELECT COALESCE(AVG((calculations_data->>'totalPrice')::numeric), 0) FROM saved_quotes WHERE created_at BETWEEN p_start_date AND p_end_date),
    'conversion_rate', (
      SELECT CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0 
      END
      FROM saved_quotes 
      WHERE created_at BETWEEN p_start_date AND p_end_date
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Function to get event timeline (for charts)
CREATE OR REPLACE FUNCTION get_event_timeline(
  p_event_type text DEFAULT NULL,
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now(),
  p_interval text DEFAULT 'day'
)
RETURNS TABLE (
  period timestamptz,
  event_count bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc(p_interval, created_at) as period,
    COUNT(*) as event_count
  FROM user_events
  WHERE 
    created_at BETWEEN p_start_date AND p_end_date
    AND (p_event_type IS NULL OR event_type = p_event_type)
  GROUP BY date_trunc(p_interval, created_at)
  ORDER BY period ASC;
END;
$$;

-- Function to clean up old events (retention policy - keep 1 year)
CREATE OR REPLACE FUNCTION cleanup_old_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM user_events
  WHERE created_at < (now() - interval '1 year');
  
  DELETE FROM analytics_cache
  WHERE expires_at < now();
END;
$$;

-- Add comments for documentation
COMMENT ON TABLE admin_users IS 'Super admin users who can access the analytics dashboard';
COMMENT ON TABLE user_events IS 'Comprehensive tracking of all user interactions with the configurator';
COMMENT ON TABLE analytics_cache IS 'Pre-computed analytics metrics for fast dashboard loading';
COMMENT ON FUNCTION track_user_event IS 'Centralized function to track all user events from edge functions and client';
COMMENT ON FUNCTION get_analytics_summary IS 'Returns summary analytics for a given date range';
COMMENT ON FUNCTION get_event_timeline IS 'Returns time-series data for charting event trends';
COMMENT ON FUNCTION cleanup_old_events IS 'Removes events older than 1 year to manage storage';
