-- Create generation_logs table to track prediction generation sessions
CREATE TABLE IF NOT EXISTS prediction_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Session info
  session_id TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- 'running' | 'completed' | 'failed'
  
  -- Parameters
  selected_year INTEGER,
  selected_months INTEGER[],
  hotel_ids TEXT[],
  
  -- Results
  predictions_created INTEGER DEFAULT 0,
  predictions_updated INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  
  -- Detailed logs
  logs JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  
  -- Metadata
  user_agent TEXT,
  ip_address TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for querying
CREATE INDEX IF NOT EXISTS idx_prediction_generation_session ON prediction_generation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_prediction_generation_started ON prediction_generation_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_generation_status ON prediction_generation_logs(status);

-- Enable RLS
ALTER TABLE prediction_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON prediction_generation_logs
  FOR ALL USING (true) WITH CHECK (true);

-- Function to add log entry
CREATE OR REPLACE FUNCTION add_generation_log_entry(
  p_session_id TEXT,
  p_log_entry JSONB
)
RETURNS void AS $$
BEGIN
  UPDATE prediction_generation_logs
  SET 
    logs = logs || p_log_entry,
    updated_at = NOW()
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- Function to complete generation session
CREATE OR REPLACE FUNCTION complete_generation_session(
  p_session_id TEXT,
  p_status TEXT,
  p_predictions_created INTEGER,
  p_predictions_updated INTEGER,
  p_errors_count INTEGER,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE prediction_generation_logs
  SET 
    completed_at = NOW(),
    status = p_status,
    predictions_created = p_predictions_created,
    predictions_updated = p_predictions_updated,
    errors_count = p_errors_count,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE session_id = p_session_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE prediction_generation_logs IS 'Tracks prediction generation sessions with detailed logs';
COMMENT ON COLUMN prediction_generation_logs.session_id IS 'Unique session identifier for tracking';
COMMENT ON COLUMN prediction_generation_logs.logs IS 'Array of log entries with timestamps and messages';

-- Success message
SELECT 
  'Prediction generation logs table created!' as message,
  'Use session_id to track generation progress' as usage;
