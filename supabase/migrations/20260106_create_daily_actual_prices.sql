-- Daily Actual Prices Table
-- מחירי מכירה בפועל (ground truth) להשוואה מול תחזיות
-- זה מה שבאמת נמכר ללקוחות (לא רק bookings)

CREATE TABLE IF NOT EXISTS daily_actual_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  room_type_id UUID REFERENCES hotel_room_types(id),
  
  -- Actual selling data (ground truth)
  actual_price NUMERIC(10,2),              -- המחיר שבו נמכר בפועל (ממוצע אם מספר מכירות)
  rooms_sold INTEGER DEFAULT 0,            -- כמה חדרים נמכרו
  total_revenue NUMERIC(10,2),             -- סה"כ הכנסה מהיום
  
  -- Source tracking
  source TEXT DEFAULT 'manual',            -- 'manual', 'pms', 'booking_com', 'expedia', etc.
  data_quality NUMERIC(3,2) DEFAULT 1.0,   -- 0-1, איכות הנתון (1 = אמין מאוד)
  
  -- Metadata
  notes TEXT,                              -- הערות (למה המחיר שונה, מבצע מיוחד וכו')
  updated_by TEXT,                         -- מי עדכן
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one entry per hotel per date (can have multiple room types)
  UNIQUE (hotel_id, date, room_type_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_actual_prices_hotel_date 
  ON daily_actual_prices(hotel_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_actual_prices_date_range 
  ON daily_actual_prices(date DESC) WHERE actual_price IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_actual_prices_quality 
  ON daily_actual_prices(hotel_id, data_quality) WHERE data_quality >= 0.8;

-- Comments
COMMENT ON TABLE daily_actual_prices IS 'Ground truth: actual selling prices and occupancy for accuracy measurement';
COMMENT ON COLUMN daily_actual_prices.actual_price IS 'Average selling price for the day (weighted by rooms sold)';
COMMENT ON COLUMN daily_actual_prices.rooms_sold IS 'Number of rooms actually sold (not just booked)';
COMMENT ON COLUMN daily_actual_prices.data_quality IS 'Confidence in data accuracy: 1.0 = fully verified, 0.5 = estimated';
COMMENT ON COLUMN daily_actual_prices.source IS 'Data source: manual, PMS integration, OTA data, etc.';

-- Grant permissions (adjust based on your RLS policies)
ALTER TABLE daily_actual_prices ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read
CREATE POLICY "Allow authenticated read on daily_actual_prices"
  ON daily_actual_prices FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated write on daily_actual_prices"
  ON daily_actual_prices FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
