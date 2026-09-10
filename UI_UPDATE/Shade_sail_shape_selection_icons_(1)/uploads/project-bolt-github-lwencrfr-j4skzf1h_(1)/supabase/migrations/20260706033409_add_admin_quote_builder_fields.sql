-- Add admin quote builder fields to saved_quotes
ALTER TABLE saved_quotes
  ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES admin_users(id),
  ADD COLUMN IF NOT EXISTS sales_rep_name text,
  ADD COLUMN IF NOT EXISTS created_via text DEFAULT 'customer';

-- Index for filtering admin-created quotes
CREATE INDEX IF NOT EXISTS idx_saved_quotes_created_via ON saved_quotes(created_via);
CREATE INDEX IF NOT EXISTS idx_saved_quotes_created_by_admin ON saved_quotes(created_by_admin_id) WHERE created_by_admin_id IS NOT NULL;