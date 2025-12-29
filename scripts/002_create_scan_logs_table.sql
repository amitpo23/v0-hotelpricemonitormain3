-- Scan Logs Table
-- Tracks all scan executions (manual, cron, API)

CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('manual', 'auto_cron', 'api', 'resilient')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partial')),
  
  -- Scan configuration
  start_date DATE NOT NULL,
  days_scanned INTEGER NOT NULL,
  end_date DATE GENERATED ALWAYS AS (start_date + (days_scanned - 1) * INTERVAL '1 day') STORED,
  
  -- Results
  results_count INTEGER DEFAULT 0,
  competitors_scanned INTEGER DEFAULT 0,
  prices_found INTEGER DEFAULT 0,
  prices_updated INTEGER DEFAULT 0,
  price_changes_detected INTEGER DEFAULT 0,
  
  -- Timing
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
      ELSE NULL
    END
  ) STORED,
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Metadata
  scan_metadata JSONB,
  checkpoint_data JSONB, -- For resilient scraper
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scan_logs_hotel ON scan_logs(hotel_id);
CREATE INDEX idx_scan_logs_type ON scan_logs(scan_type);
CREATE INDEX idx_scan_logs_status ON scan_logs(status);
CREATE INDEX idx_scan_logs_triggered ON scan_logs(triggered_at DESC);
CREATE INDEX idx_scan_logs_date_range ON scan_logs(start_date, end_date);
CREATE INDEX idx_scan_logs_hotel_date ON scan_logs(hotel_id, triggered_at DESC);

-- Update trigger
CREATE OR REPLACE FUNCTION update_scan_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scan_logs_updated_at
  BEFORE UPDATE ON scan_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_scan_logs_updated_at();

-- Comments
COMMENT ON TABLE scan_logs IS 'Tracks all hotel price scan executions with detailed metrics';
COMMENT ON COLUMN scan_logs.scan_type IS 'Type of scan: manual (UI), auto_cron (scheduled), api (direct API), resilient (checkpoint-based)';
COMMENT ON COLUMN scan_logs.status IS 'Current status: pending, running, completed, failed, partial';
COMMENT ON COLUMN scan_logs.checkpoint_data IS 'State data for resilient scraper to resume from';
COMMENT ON COLUMN scan_logs.scan_metadata IS 'Additional data: competitors list, room types scanned, etc.';

-- Example queries
COMMENT ON TABLE scan_logs IS $comment$
Example queries:

-- Get recent scans
SELECT * FROM scan_logs 
WHERE hotel_id = '716e1e8f-3537-4f67-875d-de3a89642175'
ORDER BY triggered_at DESC 
LIMIT 10;

-- Success rate by type
SELECT 
  scan_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'completed') as successful,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / COUNT(*), 2) as success_rate,
  AVG(duration_seconds) as avg_duration_sec,
  SUM(prices_found) as total_prices
FROM scan_logs
GROUP BY scan_type;

-- Failed scans with errors
SELECT 
  triggered_at,
  scan_type,
  error_message,
  start_date,
  days_scanned
FROM scan_logs
WHERE status = 'failed'
ORDER BY triggered_at DESC;

-- Daily scan performance
SELECT 
  DATE(triggered_at) as scan_date,
  COUNT(*) as scans,
  SUM(prices_found) as prices,
  AVG(duration_seconds) as avg_duration
FROM scan_logs
WHERE triggered_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(triggered_at)
ORDER BY scan_date DESC;
$comment$;
