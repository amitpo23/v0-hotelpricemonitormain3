-- Enhanced Booking Analytics Tables
-- Add advanced booking intelligence tracking

-- 1. Booking Curve Analysis - Track booking patterns by lead time
CREATE TABLE IF NOT EXISTS booking_curve_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Lead time buckets (days before check-in)
  bookings_0_7_days INTEGER DEFAULT 0,
  bookings_8_14_days INTEGER DEFAULT 0,
  bookings_15_30_days INTEGER DEFAULT 0,
  bookings_31_60_days INTEGER DEFAULT 0,
  bookings_61_90_days INTEGER DEFAULT 0,
  bookings_90_plus_days INTEGER DEFAULT 0,
  
  -- Revenue by lead time
  revenue_0_7_days NUMERIC(10,2) DEFAULT 0,
  revenue_8_14_days NUMERIC(10,2) DEFAULT 0,
  revenue_15_30_days NUMERIC(10,2) DEFAULT 0,
  revenue_31_60_days NUMERIC(10,2) DEFAULT 0,
  revenue_61_90_days NUMERIC(10,2) DEFAULT 0,
  revenue_90_plus_days NUMERIC(10,2) DEFAULT 0,
  
  -- Metrics
  avg_lead_time_days NUMERIC(5,1),
  booking_window_trend TEXT, -- 'last_minute' | 'early_bird' | 'mixed'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT booking_curve_hotel_date UNIQUE(hotel_id, analysis_date)
);

CREATE INDEX IF NOT EXISTS idx_booking_curve_hotel ON booking_curve_analysis(hotel_id);
CREATE INDEX IF NOT EXISTS idx_booking_curve_date ON booking_curve_analysis(analysis_date DESC);

COMMENT ON TABLE booking_curve_analysis IS 'Tracks booking patterns by lead time to understand booking behavior';

-- 2. Cancellation Tracking
CREATE TABLE IF NOT EXISTS cancellation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  booking_id UUID,
  
  -- Booking details
  booked_date DATE NOT NULL,
  cancelled_date DATE NOT NULL,
  check_in_date DATE NOT NULL,
  
  -- Financial impact
  booking_value NUMERIC(10,2),
  refund_amount NUMERIC(10,2),
  cancellation_fee NUMERIC(10,2),
  
  -- Timing
  days_before_checkin INTEGER, -- Lead time when cancelled
  booking_to_cancellation_days INTEGER, -- How long they held it
  
  -- Reason (if available)
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cancellation_hotel ON cancellation_tracking(hotel_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_date ON cancellation_tracking(cancelled_date DESC);

COMMENT ON TABLE cancellation_tracking IS 'Tracks cancellations to calculate cancellation rate and patterns';

-- 3. Price Sensitivity Analysis
CREATE TABLE IF NOT EXISTS price_sensitivity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Price changes
  previous_price NUMERIC(10,2),
  new_price NUMERIC(10,2),
  price_change_percent NUMERIC(5,2),
  
  -- Booking response (7 days before/after)
  bookings_before_7days INTEGER,
  bookings_after_7days INTEGER,
  
  -- Revenue impact
  revenue_before_7days NUMERIC(10,2),
  revenue_after_7days NUMERIC(10,2),
  
  -- Elasticity
  demand_elasticity NUMERIC(5,3), -- % change in bookings / % change in price
  
  -- Context
  competitor_avg_price NUMERIC(10,2),
  occupancy_before NUMERIC(5,2),
  occupancy_after NUMERIC(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_sensitivity_hotel ON price_sensitivity_log(hotel_id);
CREATE INDEX IF NOT EXISTS idx_price_sensitivity_date ON price_sensitivity_log(analysis_date DESC);

COMMENT ON TABLE price_sensitivity_log IS 'Tracks how price changes affect booking velocity - critical for ML';

-- 4. Booking Velocity Snapshots (daily tracking)
CREATE TABLE IF NOT EXISTS booking_velocity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Velocity metrics
  bookings_last_7days INTEGER,
  bookings_last_14days INTEGER,
  bookings_last_30days INTEGER,
  
  -- Advanced metrics
  avg_bookings_per_day NUMERIC(5,2),
  velocity_trend TEXT, -- 'accelerating' | 'increasing' | 'stable' | 'decreasing' | 'declining'
  velocity_score NUMERIC(5,2), -- 0-100
  
  -- Booking curve summary
  avg_lead_time NUMERIC(5,1),
  last_minute_ratio NUMERIC(5,3), -- % bookings in last 7 days
  
  -- Cancellation metrics
  cancellation_rate_7days NUMERIC(5,3),
  cancellation_rate_30days NUMERIC(5,3),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT velocity_snapshot_hotel_date UNIQUE(hotel_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_velocity_snapshot_hotel ON booking_velocity_snapshots(hotel_id);
CREATE INDEX IF NOT EXISTS idx_velocity_snapshot_date ON booking_velocity_snapshots(snapshot_date DESC);

COMMENT ON TABLE booking_velocity_snapshots IS 'Daily snapshots of booking velocity for trend analysis';

-- 5. Add columns to bookings table if missing
DO $$
BEGIN
  -- Add lead_time_days column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'lead_time_days'
  ) THEN
    ALTER TABLE bookings ADD COLUMN lead_time_days INTEGER;
    COMMENT ON COLUMN bookings.lead_time_days IS 'Days between booking date and check-in date';
  END IF;

  -- Add cancellation_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'cancellation_date'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancellation_date DATE;
    COMMENT ON COLUMN bookings.cancellation_date IS 'Date when booking was cancelled';
  END IF;

  -- Add cancellation_reason column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'cancellation_reason'
  ) THEN
    ALTER TABLE bookings ADD COLUMN cancellation_reason TEXT;
    COMMENT ON COLUMN bookings.cancellation_reason IS 'Reason for cancellation if provided';
  END IF;
END $$;

-- 6. Function to calculate lead time for existing bookings
CREATE OR REPLACE FUNCTION update_lead_time() RETURNS void AS $$
BEGIN
  UPDATE bookings
  SET lead_time_days = DATE_PART('day', check_in_date::timestamp - created_at::timestamp)
  WHERE lead_time_days IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the update
SELECT update_lead_time();

-- 7. Enable RLS on new tables
ALTER TABLE booking_curve_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancellation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_sensitivity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_velocity_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all for authenticated users" ON booking_curve_analysis
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON cancellation_tracking
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON price_sensitivity_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON booking_velocity_snapshots
  FOR ALL USING (true) WITH CHECK (true);

-- Success message
SELECT 
  'Enhanced booking analytics tables created successfully!' as message,
  COUNT(*) as new_tables
FROM information_schema.tables 
WHERE table_name IN (
  'booking_curve_analysis',
  'cancellation_tracking', 
  'price_sensitivity_log',
  'booking_velocity_snapshots'
);
