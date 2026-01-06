-- Add new columns to prediction_accuracy for improved tracking
-- Part of accuracy measurement improvement (weighted MAPE)

ALTER TABLE prediction_accuracy 
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'bookings_fallback',
  ADD COLUMN IF NOT EXISTS data_quality NUMERIC(3,2) DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS date_weight NUMERIC(4,2) DEFAULT 1.0;

-- Update existing records with default values
UPDATE prediction_accuracy 
SET 
  data_source = 'bookings_fallback',
  data_quality = 0.6,
  date_weight = 1.0
WHERE data_source IS NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_data_quality 
  ON prediction_accuracy(data_quality DESC) WHERE data_quality >= 0.8;

CREATE INDEX IF NOT EXISTS idx_prediction_accuracy_source 
  ON prediction_accuracy(data_source);

-- Comments
COMMENT ON COLUMN prediction_accuracy.data_source IS 'Source of actual data: actual_prices (best), bookings_fallback, manual, etc.';
COMMENT ON COLUMN prediction_accuracy.data_quality IS 'Reliability of actual data: 1.0 = verified, 0.6 = inferred from bookings, 0.5 = estimated';
COMMENT ON COLUMN prediction_accuracy.date_weight IS 'Importance weight for this date (high-demand dates get higher weight in MAPE calculation)';
