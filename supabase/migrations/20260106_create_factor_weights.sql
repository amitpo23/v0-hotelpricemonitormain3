-- Factor Weights Table
-- Stores optimized weights for each prediction factor per hotel
-- Learned from prediction_accuracy data via regression

CREATE TABLE IF NOT EXISTS factor_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  
  -- Factor identification
  factor_name TEXT NOT NULL, -- 'weekend', 'occupancy', 'competitor', 'seasonality', etc.
  factor_type TEXT NOT NULL, -- 'multiplier' | 'threshold' | 'coefficient'
  
  -- Weight values
  weight_value NUMERIC(6,3) NOT NULL DEFAULT 1.0, -- The optimized weight
  default_value NUMERIC(6,3) NOT NULL,            -- Original hard-coded value
  confidence NUMERIC(3,2) DEFAULT 0.5,            -- 0-1, how confident we are in this weight
  
  -- Performance tracking
  samples_used INTEGER DEFAULT 0,                 -- How many predictions used for optimization
  avg_error_with_weight NUMERIC(5,2),             -- Average error when using this weight
  avg_error_without_weight NUMERIC(5,2),          -- Average error with default weight
  improvement_percent NUMERIC(5,2),               -- % improvement from optimization
  
  -- Optimization metadata
  optimization_method TEXT DEFAULT 'linear_regression', -- 'linear_regression' | 'grid_search' | 'manual'
  r_squared NUMERIC(5,4),                         -- R² of regression model (goodness of fit)
  last_optimized_at TIMESTAMP WITH TIME ZONE,
  
  -- Version control
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One active weight per hotel per factor
  UNIQUE (hotel_id, factor_name, is_active)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_factor_weights_hotel 
  ON factor_weights(hotel_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_factor_weights_factor 
  ON factor_weights(factor_name);

CREATE INDEX IF NOT EXISTS idx_factor_weights_performance 
  ON factor_weights(improvement_percent DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_factor_weights_optimized 
  ON factor_weights(last_optimized_at DESC NULLS LAST);

-- Comments
COMMENT ON TABLE factor_weights IS 'Optimized prediction factor weights learned from historical accuracy data';
COMMENT ON COLUMN factor_weights.weight_value IS 'Optimized weight (e.g., 1.18 instead of hard-coded 1.15)';
COMMENT ON COLUMN factor_weights.confidence IS 'Statistical confidence in this weight (0-1, based on sample size and R²)';
COMMENT ON COLUMN factor_weights.improvement_percent IS 'How much this optimization improved accuracy over default';

-- Grant permissions
ALTER TABLE factor_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on factor_weights"
  ON factor_weights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated write on factor_weights"
  ON factor_weights FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Helper function to get active weight for a factor
CREATE OR REPLACE FUNCTION get_factor_weight(
  p_hotel_id UUID,
  p_factor_name TEXT,
  p_default_value NUMERIC DEFAULT 1.0
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_weight NUMERIC;
BEGIN
  SELECT weight_value INTO v_weight
  FROM factor_weights
  WHERE hotel_id = p_hotel_id
    AND factor_name = p_factor_name
    AND is_active = true
    AND confidence >= 0.6  -- Only use weights we're confident about
  ORDER BY last_optimized_at DESC
  LIMIT 1;
  
  -- Return optimized weight if found, otherwise default
  RETURN COALESCE(v_weight, p_default_value);
END;
$$;

COMMENT ON FUNCTION get_factor_weight IS 'Get optimized weight for a factor, fallback to default if not found or low confidence';

-- Initial seed data (we'll populate these with defaults, then optimize)
INSERT INTO factor_weights (hotel_id, factor_name, factor_type, weight_value, default_value, confidence, is_active, notes)
SELECT 
  h.id,
  factor,
  'multiplier',
  default_val,
  default_val,
  0.5,  -- Start with medium confidence
  true,
  'Initial default values from prediction-algorithms.ts'
FROM hotels h
CROSS JOIN (
  VALUES 
    ('weekend_multiplier', 1.15),
    ('holiday_multiplier', 1.25),
    ('last_minute_multiplier', 1.20),
    ('short_notice_multiplier', 1.10),
    ('far_future_multiplier', 0.95),
    ('high_occupancy_multiplier', 1.30),
    ('good_occupancy_multiplier', 1.15),
    ('low_occupancy_multiplier', 0.90),
    ('seasonality_peak_threshold', 1.15),
    ('seasonality_low_threshold', 0.90),
    ('competitor_expensive_threshold', 1.20),
    ('competitor_cheap_threshold', -0.10),
    ('demand_high_multiplier', 1.15),
    ('demand_low_multiplier', 0.85)
) AS factors(factor, default_val)
ON CONFLICT (hotel_id, factor_name, is_active) DO NOTHING;

-- Log table for weight changes (audit trail)
CREATE TABLE IF NOT EXISTS factor_weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_weight_id UUID NOT NULL REFERENCES factor_weights(id) ON DELETE CASCADE,
  old_weight NUMERIC(6,3),
  new_weight NUMERIC(6,3),
  reason TEXT,
  changed_by TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factor_weight_history_weight 
  ON factor_weight_history(factor_weight_id, changed_at DESC);

COMMENT ON TABLE factor_weight_history IS 'Audit trail of all weight changes for debugging and rollback';
