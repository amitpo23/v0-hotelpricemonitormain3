-- =====================================================
-- Decision Agent Database Tables
-- =====================================================
-- Tables needed for the enhanced multi-agent system

-- 1. Agent Execution Logs
-- Track every agent execution for performance monitoring
CREATE TABLE IF NOT EXISTS agent_execution_logs (
  id BIGSERIAL PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  target_date DATE NOT NULL,
  execution_time_ms INT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  confidence DECIMAL(3,2),  -- 0.00 to 1.00
  recommendation TEXT,  -- increase, decrease, maintain
  suggested_multiplier DECIMAL(5,3),  -- e.g., 1.150 = +15%
  reasoning JSONB,
  data_points JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_agent_exec_logs_hotel_agent 
  ON agent_execution_logs(hotel_id, agent_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_exec_logs_date 
  ON agent_execution_logs(target_date, agent_name);

-- 2. Agent Accuracy Tracking
-- Track historical accuracy of each agent's predictions
CREATE TABLE IF NOT EXISTS agent_accuracy_tracking (
  id BIGSERIAL PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  prediction_date DATE NOT NULL,
  target_date DATE NOT NULL,
  predicted_price INT NOT NULL,
  actual_price INT,
  prediction_error INT,  -- actual - predicted
  prediction_error_pct DECIMAL(5,2),  -- percentage error
  was_accurate BOOLEAN,  -- within 5% tolerance
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Index for accuracy calculations
CREATE INDEX IF NOT EXISTS idx_agent_accuracy_hotel_agent 
  ON agent_accuracy_tracking(hotel_id, agent_name, prediction_date DESC);

-- 3. Decision Logs
-- Track every Decision Agent decision
CREATE TABLE IF NOT EXISTS decision_logs (
  id BIGSERIAL PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  location TEXT NOT NULL,
  target_date DATE NOT NULL,
  current_price INT NOT NULL,
  
  -- Decision output
  recommendation TEXT NOT NULL,  -- increase, decrease, maintain
  suggested_price INT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reasoning JSONB NOT NULL,
  warnings JSONB,
  dominant_factors JSONB,  -- Top factors that influenced decision
  
  -- Agent inputs (what went into the decision)
  agent_outputs JSONB NOT NULL,
  context JSONB NOT NULL,
  
  -- Metadata
  processing_time_ms INT,
  version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for decision history
CREATE INDEX IF NOT EXISTS idx_decision_logs_hotel_date 
  ON decision_logs(hotel_id, target_date DESC);

CREATE INDEX IF NOT EXISTS idx_decision_logs_created 
  ON decision_logs(created_at DESC);

-- 4. Israeli Holidays (enhanced)
-- Store detailed holiday information with tourism impact
CREATE TABLE IF NOT EXISTS israeli_holidays (
  id BIGSERIAL PRIMARY KEY,
  holiday_name TEXT NOT NULL,
  holiday_name_hebrew TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  holiday_type TEXT NOT NULL,  -- national, religious, memorial, etc.
  is_vacation_day BOOLEAN DEFAULT FALSE,
  tourism_impact DECIMAL(3,2) DEFAULT 1.00,  -- multiplier (1.0 = normal, 1.5 = +50%)
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_israeli_holidays_dates 
  ON israeli_holidays(start_date, end_date);

-- 5. External Data Cache (enhanced)
-- Cache external API responses with metadata
CREATE TABLE IF NOT EXISTS external_data_cache (
  id BIGSERIAL PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  data_source TEXT NOT NULL,  -- tavily, serpapi, hebcal, etc.
  data JSONB NOT NULL,
  confidence DECIMAL(3,2),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INT DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_external_data_cache_key 
  ON external_data_cache(cache_key);

CREATE INDEX IF NOT EXISTS idx_external_data_cache_expires 
  ON external_data_cache(expires_at);

-- 6. Autopilot Executions
-- Track autonomous price changes made by autopilot
CREATE TABLE IF NOT EXISTS autopilot_executions (
  id BIGSERIAL PRIMARY KEY,
  hotel_id TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  target_date DATE NOT NULL,
  
  -- Price change
  old_price INT NOT NULL,
  new_price INT NOT NULL,
  price_change_pct DECIMAL(5,2) NOT NULL,
  
  -- Decision context
  decision_id BIGINT REFERENCES decision_logs(id),
  recommendation TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  reasoning JSONB NOT NULL,
  
  -- Execution details
  execution_status TEXT NOT NULL,  -- success, failed, rolled_back
  error_message TEXT,
  
  -- Outcome tracking
  actual_bookings_before INT,
  actual_bookings_after INT,
  revenue_before DECIMAL(10,2),
  revenue_after DECIMAL(10,2),
  roi DECIMAL(5,2),  -- Return on investment
  
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ
);

-- Index for autopilot tracking
CREATE INDEX IF NOT EXISTS idx_autopilot_hotel_date 
  ON autopilot_executions(hotel_id, target_date DESC);

CREATE INDEX IF NOT EXISTS idx_autopilot_executed 
  ON autopilot_executions(executed_at DESC);

-- =====================================================
-- Views for Analytics
-- =====================================================

-- Agent Performance Summary
CREATE OR REPLACE VIEW agent_performance_summary AS
SELECT 
  agent_name,
  COUNT(*) as total_executions,
  AVG(confidence) as avg_confidence,
  AVG(execution_time_ms) as avg_execution_time,
  SUM(CASE WHEN success THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as success_rate,
  MAX(created_at) as last_execution
FROM agent_execution_logs
GROUP BY agent_name;

-- Agent Accuracy Summary
CREATE OR REPLACE VIEW agent_accuracy_summary AS
SELECT 
  agent_name,
  COUNT(*) as total_predictions,
  AVG(ABS(prediction_error_pct)) as avg_error_pct,
  SUM(CASE WHEN was_accurate THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as accuracy_rate,
  AVG(confidence) as avg_confidence
FROM agent_accuracy_tracking
WHERE actual_price IS NOT NULL
GROUP BY agent_name;

-- Decision Quality Over Time
CREATE OR REPLACE VIEW decision_quality_trends AS
SELECT 
  DATE_TRUNC('day', created_at) as decision_date,
  COUNT(*) as total_decisions,
  AVG(confidence) as avg_confidence,
  AVG(processing_time_ms) as avg_processing_time,
  COUNT(CASE WHEN warnings IS NOT NULL THEN 1 END) as decisions_with_warnings
FROM decision_logs
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY decision_date DESC;

-- Autopilot ROI Summary
CREATE OR REPLACE VIEW autopilot_roi_summary AS
SELECT 
  hotel_id,
  hotel_name,
  COUNT(*) as total_executions,
  SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) as successful_changes,
  AVG(price_change_pct) as avg_price_change_pct,
  AVG(roi) as avg_roi,
  SUM(revenue_after - revenue_before) as total_revenue_impact
FROM autopilot_executions
WHERE evaluated_at IS NOT NULL
GROUP BY hotel_id, hotel_name;

-- =====================================================
-- Sample Data: Israeli Holidays 2025
-- =====================================================

INSERT INTO israeli_holidays (holiday_name, holiday_name_hebrew, start_date, end_date, holiday_type, is_vacation_day, tourism_impact, description) VALUES
('Purim', 'פורים', '2025-03-14', '2025-03-14', 'religious', true, 1.2, 'Jewish holiday celebrating the saving of the Jewish people'),
('Passover (Pesach)', 'פסח', '2025-04-13', '2025-04-20', 'religious', true, 1.8, 'Major Jewish holiday, week-long vacation'),
('Independence Day', 'יום העצמאות', '2025-05-02', '2025-05-02', 'national', true, 1.5, 'Israeli Independence Day - major tourism event'),
('Shavuot', 'שבועות', '2025-06-02', '2025-06-03', 'religious', true, 1.3, 'Jewish holiday celebrating the giving of the Torah'),
('Rosh Hashanah', 'ראש השנה', '2025-09-23', '2025-09-24', 'religious', true, 1.4, 'Jewish New Year'),
('Yom Kippur', 'יום כיפור', '2025-10-02', '2025-10-02', 'religious', true, 1.2, 'Day of Atonement - everything closes'),
('Sukkot', 'סוכות', '2025-10-07', '2025-10-13', 'religious', true, 1.6, 'Jewish holiday, week-long vacation'),
('Hanukkah', 'חנוכה', '2025-12-15', '2025-12-22', 'religious', false, 1.2, '8-day Jewish holiday, not a vacation but increased tourism')
ON CONFLICT DO NOTHING;

-- =====================================================
-- Utility Functions
-- =====================================================

-- Function to calculate agent accuracy
CREATE OR REPLACE FUNCTION update_agent_accuracy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_price IS NOT NULL THEN
    NEW.prediction_error = NEW.actual_price - NEW.predicted_price;
    NEW.prediction_error_pct = (NEW.prediction_error::DECIMAL / NEW.predicted_price * 100);
    NEW.was_accurate = ABS(NEW.prediction_error_pct) <= 5.0;
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate accuracy
CREATE TRIGGER trigger_update_agent_accuracy
BEFORE UPDATE ON agent_accuracy_tracking
FOR EACH ROW
WHEN (NEW.actual_price IS NOT NULL)
EXECUTE FUNCTION update_agent_accuracy();

-- =====================================================
-- Permissions
-- =====================================================

-- Grant access to service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant read access to anon for views
GRANT SELECT ON agent_performance_summary TO anon;
GRANT SELECT ON agent_accuracy_summary TO anon;
GRANT SELECT ON decision_quality_trends TO anon;
GRANT SELECT ON autopilot_roi_summary TO anon;

COMMENT ON TABLE agent_execution_logs IS 'Tracks every execution of any agent for performance monitoring';
COMMENT ON TABLE agent_accuracy_tracking IS 'Tracks historical accuracy of agent predictions vs actual prices';
COMMENT ON TABLE decision_logs IS 'Tracks every Decision Agent decision with full context';
COMMENT ON TABLE israeli_holidays IS 'Israeli holidays with tourism impact multipliers';
COMMENT ON TABLE external_data_cache IS 'Cache for external API responses';
COMMENT ON TABLE autopilot_executions IS 'Tracks autonomous price changes by autopilot system';
