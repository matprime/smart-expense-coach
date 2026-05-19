-- Create tracking_events table
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

-- Allow public insertion (since we don't have auth yet, and it's for tracking)
CREATE POLICY "Allow anonymous insertion of tracking events"
ON tracking_events FOR INSERT
TO public
WITH CHECK (true);

-- Allow public selection (for the analytics page)
CREATE POLICY "Allow anyone to view tracking events"
ON tracking_events FOR SELECT
TO public
USING (true);

-- Create a view for easy analysis
CREATE OR REPLACE VIEW analytics_summary AS
SELECT
  event_type,
  event_name,
  COUNT(*) as total_count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM tracking_events
GROUP BY event_type, event_name;
