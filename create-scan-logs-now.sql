CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL,
  status TEXT NOT NULL,
  start_date DATE NOT NULL,
  days_scanned INTEGER NOT NULL,
  results_count INTEGER DEFAULT 0,
  competitors_scanned INTEGER DEFAULT 0,
  prices_found INTEGER DEFAULT 0,
  prices_updated INTEGER DEFAULT 0,
  price_changes_detected INTEGER DEFAULT 0,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  error_details JSONB,
  scan_metadata JSONB,
  checkpoint_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_hotel ON scan_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_type ON scan_logs(scan_type);
CREATE INDEX IF NOT EXISTS idx_scan_logs_status ON scan_logs(status);
CREATE INDEX IF NOT EXISTS idx_scan_logs_triggered ON scan_logs(triggered_at DESC);
