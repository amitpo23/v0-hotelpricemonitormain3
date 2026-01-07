-- =============================================
-- ACCURACY IMPROVEMENTS - COMBINED MIGRATIONS
-- Run this ENTIRE script in Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new
-- =============================================

-- =============================================
-- PART 1: Daily Actual Prices Table (Ground Truth)
-- =============================================

CREATE TABLE IF NOT EXISTS daily_actual_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  room_type_id UUID REFERENCES hotel_room_types(id),
  actual_price NUMERIC(10,2),
  rooms_sold INTEGER DEFAULT 0,
  total_revenue NUMERIC(10,2),
  source TEXT DEFAULT 'manual',
  data_quality NUMERIC(3,2) DEFAULT 1.0,
  notes TEXT,
  updated_by TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (hotel_id, date, room_type_id)
);

CREATE INDEX IF NOT EXISTS idx_actual_prices_hotel_date 
  ON daily_actual_prices(hotel_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_actual_prices_date_range 
  ON daily_actual_prices(date DESC) WHERE actual_price IS NOT NULL;

ALTER TABLE daily_actual_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on daily_actual_prices"
  ON daily_actual_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write on daily_actual_prices"
  ON daily_actual_prices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- PART 2: Accuracy Tracking Columns
-- =============================================

ALTER TABLE prediction_accuracy 
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'bookings_fallback',
  ADD COLUMN IF NOT EXISTS data_quality NUMERIC(3,2) DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS date_weight NUMERIC(4,2) DEFAULT 1.0;

UPDATE prediction_accuracy 
SET data_source = 'bookings_fallback', data_quality = 0.6, date_weight = 1.0
WHERE data_source IS NULL;

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_data_quality 
  ON prediction_accuracy(data_quality DESC) WHERE data_quality >= 0.8;

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_source 
  ON prediction_accuracy(data_source);

-- =============================================
-- PART 3: Factor Weights System
-- =============================================

CREATE TABLE IF NOT EXISTS factor_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  factor_name TEXT NOT NULL,
  factor_type TEXT NOT NULL,
  weight_value NUMERIC(6,3) NOT NULL DEFAULT 1.0,
  default_value NUMERIC(6,3) NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 0.5,
  samples_used INTEGER DEFAULT 0,
  avg_error_with_weight NUMERIC(5,2),
  avg_error_without_weight NUMERIC(5,2),
  improvement_percent NUMERIC(5,2),
  optimization_method TEXT DEFAULT 'linear_regression',
  r_squared NUMERIC(5,4),
  last_optimized_at TIMESTAMP WITH TIME ZONE,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (hotel_id, factor_name, is_active)
);

CREATE INDEX IF NOT EXISTS idx_factor_weights_hotel 
  ON factor_weights(hotel_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_factor_weights_factor 
  ON factor_weights(factor_name);

ALTER TABLE factor_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on factor_weights"
  ON factor_weights FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated write on factor_weights"
  ON factor_weights FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Helper function
CREATE OR REPLACE FUNCTION get_factor_weight(
  p_hotel_id UUID,
  p_factor_name TEXT,
  p_default_value NUMERIC DEFAULT 1.0
)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $$
DECLARE v_weight NUMERIC;
BEGIN
  SELECT weight_value INTO v_weight
  FROM factor_weights
  WHERE hotel_id = p_hotel_id AND factor_name = p_factor_name
    AND is_active = true AND confidence >= 0.6
  ORDER BY last_optimized_at DESC LIMIT 1;
  RETURN COALESCE(v_weight, p_default_value);
END; $$;

-- Seed default weights
INSERT INTO factor_weights (hotel_id, factor_name, factor_type, weight_value, default_value, confidence, is_active, notes)
SELECT h.id, factor, 'multiplier', default_val, default_val, 0.5, true, 'Initial defaults'
FROM hotels h
CROSS JOIN (VALUES 
  ('weekend_multiplier', 1.15), ('holiday_multiplier', 1.25),
  ('last_minute_multiplier', 1.20), ('short_notice_multiplier', 1.10),
  ('far_future_multiplier', 0.95), ('high_occupancy_multiplier', 1.30),
  ('good_occupancy_multiplier', 1.15), ('low_occupancy_multiplier', 0.90),
  ('demand_high_multiplier', 1.15), ('demand_low_multiplier', 0.85)
) AS factors(factor, default_val)
ON CONFLICT (hotel_id, factor_name, is_active) DO NOTHING;

-- =============================================
-- PART 4: Weight History (Audit Trail)
-- =============================================

CREATE TABLE IF NOT EXISTS factor_weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID,
  factor_name TEXT,
  old_value NUMERIC(6,3),
  new_value NUMERIC(6,3),
  reason TEXT,
  triggered_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factor_weight_history_hotel 
  ON factor_weight_history(hotel_id, created_at DESC);

-- =============================================
-- DONE! Tables created successfully
-- =============================================
SELECT 'Migration completed!' as status,
  (SELECT count(*) FROM daily_actual_prices) as actual_prices_rows,
  (SELECT count(*) FROM factor_weights) as factor_weights_rows;
