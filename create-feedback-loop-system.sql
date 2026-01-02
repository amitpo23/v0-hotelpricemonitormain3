-- Prediction Accuracy Tracking System
-- Track prediction performance to improve ML models

-- 1. Prediction Accuracy Log
CREATE TABLE IF NOT EXISTS prediction_accuracy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  
  -- Prediction details
  prediction_date DATE NOT NULL,
  prediction_made_at TIMESTAMPTZ NOT NULL,
  prediction_id UUID, -- Link to price_predictions if available
  
  -- Predicted values
  predicted_price NUMERIC(10,2) NOT NULL,
  predicted_occupancy NUMERIC(5,2),
  predicted_demand TEXT, -- 'low' | 'medium' | 'high' | 'very_high'
  predicted_revenue NUMERIC(10,2),
  
  -- Actual values (filled after the date passes)
  actual_price NUMERIC(10,2),
  actual_occupancy NUMERIC(5,2),
  actual_bookings INTEGER,
  actual_revenue NUMERIC(10,2),
  
  -- Accuracy metrics
  price_error_percent NUMERIC(5,2), -- |predicted - actual| / actual * 100
  occupancy_error_percent NUMERIC(5,2),
  revenue_error_percent NUMERIC(5,2),
  demand_prediction_correct BOOLEAN,
  
  -- Overall accuracy score (0-100)
  accuracy_score NUMERIC(5,2),
  
  -- Context for ML learning
  prediction_confidence NUMERIC(5,3), -- Confidence when prediction was made
  factors_used JSONB, -- Which factors/agents were used
  competitor_avg_price NUMERIC(10,2),
  days_before_date INTEGER, -- Lead time of prediction
  
  -- Was recommendation followed?
  recommendation_followed BOOLEAN,
  recommendation_text TEXT,
  
  -- Timestamps
  actual_data_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT prediction_accuracy_unique UNIQUE(hotel_id, prediction_date, prediction_made_at)
);

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_hotel ON prediction_accuracy(hotel_id);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_date ON prediction_accuracy(prediction_date DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_score ON prediction_accuracy(accuracy_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_updated ON prediction_accuracy(actual_data_updated_at DESC NULLS LAST);

COMMENT ON TABLE prediction_accuracy IS 'Tracks prediction accuracy for continuous model improvement';
COMMENT ON COLUMN prediction_accuracy.accuracy_score IS 'Combined score: 100 - avg(price_error, occupancy_error, revenue_error)';

-- 2. Model Performance Summary (aggregated metrics)
CREATE TABLE IF NOT EXISTS model_performance_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  
  -- Time period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL, -- 'daily' | 'weekly' | 'monthly'
  
  -- Aggregate metrics
  total_predictions INTEGER DEFAULT 0,
  predictions_with_actuals INTEGER DEFAULT 0,
  
  -- Accuracy metrics
  avg_accuracy_score NUMERIC(5,2),
  avg_price_error_percent NUMERIC(5,2),
  avg_occupancy_error_percent NUMERIC(5,2),
  avg_revenue_error_percent NUMERIC(5,2),
  
  -- Predictions distribution
  very_accurate_count INTEGER, -- accuracy > 90
  accurate_count INTEGER, -- accuracy 75-90
  moderate_count INTEGER, -- accuracy 60-75
  poor_count INTEGER, -- accuracy < 60
  
  -- Recommendation effectiveness
  recommendations_followed INTEGER,
  recommendations_successful INTEGER, -- Followed AND resulted in good outcome
  recommendation_success_rate NUMERIC(5,3),
  
  -- Best/worst performers
  best_prediction_day DATE,
  best_prediction_score NUMERIC(5,2),
  worst_prediction_day DATE,
  worst_prediction_score NUMERIC(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT model_performance_period UNIQUE(hotel_id, period_start, period_end, period_type)
);

CREATE INDEX IF NOT EXISTS idx_model_performance_hotel ON model_performance_summary(hotel_id);
CREATE INDEX IF NOT EXISTS idx_model_performance_period ON model_performance_summary(period_start DESC);

COMMENT ON TABLE model_performance_summary IS 'Aggregated model performance metrics for reporting and analysis';

-- 3. Factor Performance Analysis (which agents/factors perform best)
CREATE TABLE IF NOT EXISTS factor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id),
  
  factor_name TEXT NOT NULL, -- 'events' | 'historical' | 'competitor' | 'velocity' | etc.
  
  -- Performance metrics
  predictions_using_factor INTEGER DEFAULT 0,
  avg_accuracy_with_factor NUMERIC(5,2),
  avg_accuracy_without_factor NUMERIC(5,2),
  
  -- Statistical significance
  performance_delta NUMERIC(5,2), -- Difference in accuracy
  confidence_level NUMERIC(5,3), -- Statistical confidence (0-1)
  
  -- Last updated
  last_analysis_date DATE NOT NULL,
  analysis_period_days INTEGER DEFAULT 30,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT factor_performance_unique UNIQUE(hotel_id, factor_name, last_analysis_date)
);

CREATE INDEX IF NOT EXISTS idx_factor_performance_hotel ON factor_performance(hotel_id);
CREATE INDEX IF NOT EXISTS idx_factor_performance_delta ON factor_performance(performance_delta DESC);

COMMENT ON TABLE factor_performance IS 'Measures which factors/agents contribute most to prediction accuracy';

-- 4. Function: Calculate accuracy score
CREATE OR REPLACE FUNCTION calculate_accuracy_score(
  p_price_error NUMERIC,
  p_occupancy_error NUMERIC,
  p_revenue_error NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  avg_error NUMERIC;
  score NUMERIC;
BEGIN
  -- Calculate average error (handling NULLs)
  avg_error := (
    COALESCE(p_price_error, 0) + 
    COALESCE(p_occupancy_error, 0) + 
    COALESCE(p_revenue_error, 0)
  ) / 3.0;
  
  -- Score = 100 - error (capped at 0)
  score := GREATEST(0, 100 - avg_error);
  
  RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Function: Update prediction with actual data
CREATE OR REPLACE FUNCTION update_prediction_actuals(
  p_hotel_id UUID,
  p_prediction_date DATE,
  p_actual_price NUMERIC,
  p_actual_occupancy NUMERIC,
  p_actual_bookings INTEGER,
  p_actual_revenue NUMERIC
) RETURNS void AS $$
DECLARE
  v_predicted_price NUMERIC;
  v_predicted_occupancy NUMERIC;
  v_predicted_revenue NUMERIC;
  v_price_error NUMERIC;
  v_occupancy_error NUMERIC;
  v_revenue_error NUMERIC;
  v_accuracy_score NUMERIC;
BEGIN
  -- Get predicted values
  SELECT predicted_price, predicted_occupancy, predicted_revenue
  INTO v_predicted_price, v_predicted_occupancy, v_predicted_revenue
  FROM prediction_accuracy
  WHERE hotel_id = p_hotel_id 
    AND prediction_date = p_prediction_date
    AND actual_price IS NULL
  LIMIT 1;
  
  IF v_predicted_price IS NOT NULL THEN
    -- Calculate errors
    v_price_error := CASE 
      WHEN p_actual_price > 0 THEN ABS(v_predicted_price - p_actual_price) / p_actual_price * 100
      ELSE NULL 
    END;
    
    v_occupancy_error := CASE 
      WHEN p_actual_occupancy > 0 THEN ABS(v_predicted_occupancy - p_actual_occupancy) / p_actual_occupancy * 100
      ELSE NULL 
    END;
    
    v_revenue_error := CASE 
      WHEN p_actual_revenue > 0 THEN ABS(v_predicted_revenue - p_actual_revenue) / p_actual_revenue * 100
      ELSE NULL 
    END;
    
    -- Calculate accuracy score
    v_accuracy_score := calculate_accuracy_score(v_price_error, v_occupancy_error, v_revenue_error);
    
    -- Update record
    UPDATE prediction_accuracy SET
      actual_price = p_actual_price,
      actual_occupancy = p_actual_occupancy,
      actual_bookings = p_actual_bookings,
      actual_revenue = p_actual_revenue,
      price_error_percent = v_price_error,
      occupancy_error_percent = v_occupancy_error,
      revenue_error_percent = v_revenue_error,
      accuracy_score = v_accuracy_score,
      actual_data_updated_at = NOW()
    WHERE hotel_id = p_hotel_id 
      AND prediction_date = p_prediction_date
      AND actual_price IS NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Function: Auto-update actuals from daily_prices (run daily)
CREATE OR REPLACE FUNCTION auto_update_prediction_actuals() RETURNS void AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Find predictions that need actual data (1-3 days old)
  FOR v_record IN 
    SELECT DISTINCT pa.hotel_id, pa.prediction_date
    FROM prediction_accuracy pa
    WHERE pa.actual_price IS NULL
      AND pa.prediction_date < CURRENT_DATE
      AND pa.prediction_date >= CURRENT_DATE - INTERVAL '3 days'
  LOOP
    -- Get actual data from daily_prices
    PERFORM update_prediction_actuals(
      v_record.hotel_id,
      v_record.prediction_date,
      (SELECT price FROM daily_prices WHERE hotel_id = v_record.hotel_id AND date = v_record.prediction_date LIMIT 1),
      (SELECT occupancy_rate FROM daily_prices WHERE hotel_id = v_record.hotel_id AND date = v_record.prediction_date LIMIT 1),
      (SELECT bookings FROM daily_prices WHERE hotel_id = v_record.hotel_id AND date = v_record.prediction_date LIMIT 1),
      (SELECT revenue FROM daily_prices WHERE hotel_id = v_record.hotel_id AND date = v_record.prediction_date LIMIT 1)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Enable RLS
ALTER TABLE prediction_accuracy ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE factor_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON prediction_accuracy
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON model_performance_summary
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON factor_performance
  FOR ALL USING (true) WITH CHECK (true);

-- Success message
SELECT 
  'Feedback Loop tables created successfully!' as message,
  'Run auto_update_prediction_actuals() daily to track accuracy' as next_step;
