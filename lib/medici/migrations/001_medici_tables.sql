-- Medici Hotels Integration - Database Migration
-- Version: 001
-- Description: Create dedicated tables for Medici Hotels API integration
-- Date: 2025-12-07

-- =============================================================================
-- Table: medici_opportunities
-- Description: Store Medici hotel opportunities for tracking and analysis
-- =============================================================================

CREATE TABLE IF NOT EXISTS medici_opportunities (
  id BIGSERIAL PRIMARY KEY,

  -- Medici IDs
  medici_opportunity_id INTEGER UNIQUE,
  medici_hotel_id INTEGER,

  -- Your hotel mapping
  hotel_id BIGINT REFERENCES hotels(id),

  -- Hotel details
  hotel_name TEXT,
  city TEXT,
  stars INTEGER,

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Pricing
  buy_price DECIMAL(10,2) NOT NULL,
  push_price DECIMAL(10,2) NOT NULL,
  profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN push_price > 0 THEN ((push_price - buy_price) / push_price * 100)
      ELSE 0
    END
  ) STORED,

  -- Room details
  board_id INTEGER NOT NULL,
  board_name TEXT,
  category_id INTEGER NOT NULL,
  category_name TEXT,
  max_rooms INTEGER,
  available_rooms INTEGER,

  -- Booking details
  rate_plan_code TEXT,
  inv_type_code TEXT,
  reservation_full_name TEXT,

  -- Additional info
  destination_id INTEGER,
  location_range INTEGER,
  provider_id INTEGER,
  provider_name TEXT,

  -- Guest details
  pax_adults INTEGER,
  pax_children INTEGER[],

  -- Status
  status TEXT DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB,

  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_prices CHECK (push_price >= buy_price),
  CONSTRAINT valid_rooms CHECK (max_rooms > 0)
);

-- Indexes for medici_opportunities
CREATE INDEX IF NOT EXISTS idx_medici_opp_hotel_id ON medici_opportunities(hotel_id);
CREATE INDEX IF NOT EXISTS idx_medici_opp_dates ON medici_opportunities(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_medici_opp_city ON medici_opportunities(city);
CREATE INDEX IF NOT EXISTS idx_medici_opp_status ON medici_opportunities(status);
CREATE INDEX IF NOT EXISTS idx_medici_opp_profit ON medici_opportunities(profit_margin);
CREATE INDEX IF NOT EXISTS idx_medici_opp_synced ON medici_opportunities(synced_at);

-- Comments for medici_opportunities
COMMENT ON TABLE medici_opportunities IS 'Medici hotel opportunities for inventory acquisition';
COMMENT ON COLUMN medici_opportunities.profit_margin IS 'Calculated profit margin percentage';
COMMENT ON COLUMN medici_opportunities.metadata IS 'Additional Medici-specific data in JSON format';

-- =============================================================================
-- Table: medici_active_rooms
-- Description: Store Medici active (purchased) rooms
-- =============================================================================

CREATE TABLE IF NOT EXISTS medici_active_rooms (
  id BIGSERIAL PRIMARY KEY,

  -- Medici IDs
  medici_room_id INTEGER UNIQUE,
  medici_hotel_id INTEGER,
  prebook_id INTEGER,

  -- Your hotel mapping
  hotel_id BIGINT REFERENCES hotels(id),

  -- Hotel details
  hotel_name TEXT NOT NULL,
  city TEXT,
  hotel_stars INTEGER,

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  nights INTEGER GENERATED ALWAYS AS (
    end_date - start_date
  ) STORED,

  -- Pricing
  buy_price DECIMAL(10,2) NOT NULL,
  push_price DECIMAL(10,2) NOT NULL,
  total_buy_cost DECIMAL(10,2) GENERATED ALWAYS AS (
    buy_price * (end_date - start_date)
  ) STORED,
  total_push_revenue DECIMAL(10,2) GENERATED ALWAYS AS (
    push_price * (end_date - start_date)
  ) STORED,
  profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN push_price > 0 THEN ((push_price - buy_price) / push_price * 100)
      ELSE 0
    END
  ) STORED,

  -- Room details
  room_board TEXT,
  room_category TEXT,

  -- Provider
  provider TEXT,

  -- Status
  status TEXT DEFAULT 'active',
  sold_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB,

  -- Constraints
  CONSTRAINT valid_room_dates CHECK (end_date > start_date),
  CONSTRAINT valid_room_prices CHECK (push_price >= buy_price)
);

-- Indexes for medici_active_rooms
CREATE INDEX IF NOT EXISTS idx_medici_rooms_hotel_id ON medici_active_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_medici_rooms_dates ON medici_active_rooms(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_medici_rooms_city ON medici_active_rooms(city);
CREATE INDEX IF NOT EXISTS idx_medici_rooms_status ON medici_active_rooms(status);
CREATE INDEX IF NOT EXISTS idx_medici_rooms_prebook ON medici_active_rooms(prebook_id);

-- Comments for medici_active_rooms
COMMENT ON TABLE medici_active_rooms IS 'Medici active (purchased) hotel rooms';
COMMENT ON COLUMN medici_active_rooms.nights IS 'Number of nights (calculated)';
COMMENT ON COLUMN medici_active_rooms.total_buy_cost IS 'Total purchase cost for all nights';
COMMENT ON COLUMN medici_active_rooms.total_push_revenue IS 'Total expected revenue for all nights';

-- =============================================================================
-- Table: medici_bookings
-- Description: Store Medici bookings (sales)
-- =============================================================================

CREATE TABLE IF NOT EXISTS medici_bookings (
  id BIGSERIAL PRIMARY KEY,

  -- Medici IDs
  medici_booking_id INTEGER UNIQUE,
  confirmation_code TEXT,
  prebook_id INTEGER,

  -- Room reference
  medici_room_id BIGINT REFERENCES medici_active_rooms(id),

  -- Your hotel mapping
  hotel_id BIGINT REFERENCES hotels(id),

  -- Hotel details
  hotel_name TEXT NOT NULL,
  city TEXT,

  -- Date range
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER GENERATED ALWAYS AS (
    check_out - check_in
  ) STORED,

  -- Pricing
  sale_price DECIMAL(10,2) NOT NULL,
  buy_cost DECIMAL(10,2),
  profit DECIMAL(10,2) GENERATED ALWAYS AS (
    sale_price - COALESCE(buy_cost, 0)
  ) STORED,

  -- Guest details
  customer_name TEXT,
  guest_details JSONB,

  -- Booking details
  booking_type TEXT, -- 'prebook', 'book', 'manual'
  booking_request JSONB,

  -- Status
  status TEXT DEFAULT 'confirmed',

  -- Timestamps
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB,

  -- Constraints
  CONSTRAINT valid_booking_dates CHECK (check_out > check_in)
);

-- Indexes for medici_bookings
CREATE INDEX IF NOT EXISTS idx_medici_bookings_hotel_id ON medici_bookings(hotel_id);
CREATE INDEX IF NOT EXISTS idx_medici_bookings_dates ON medici_bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_medici_bookings_status ON medici_bookings(status);
CREATE INDEX IF NOT EXISTS idx_medici_bookings_confirmation ON medici_bookings(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_medici_bookings_prebook ON medici_bookings(prebook_id);

-- Comments for medici_bookings
COMMENT ON TABLE medici_bookings IS 'Medici hotel bookings and sales';
COMMENT ON COLUMN medici_bookings.profit IS 'Calculated profit (sale_price - buy_cost)';

-- =============================================================================
-- Table: medici_price_history
-- Description: Store historical Medici search results for trend analysis
-- =============================================================================

CREATE TABLE IF NOT EXISTS medici_price_history (
  id BIGSERIAL PRIMARY KEY,

  -- Search parameters
  city TEXT,
  hotel_name TEXT,
  stars INTEGER,

  -- Date range
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,

  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'ILS',

  -- Room details
  room_type TEXT,
  board_type TEXT,

  -- Availability
  availability BOOLEAN DEFAULT true,

  -- Provider
  provider TEXT,

  -- Search metadata
  search_adults INTEGER,
  search_children INTEGER[],

  -- Extended data
  hotel_id INTEGER,
  amenities TEXT[],
  rating DECIMAL(3,2),
  reviews INTEGER,
  location JSONB,

  -- Timestamps
  scraped_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB
);

-- Indexes for medici_price_history
CREATE INDEX IF NOT EXISTS idx_medici_history_city_dates ON medici_price_history(city, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_medici_history_hotel ON medici_price_history(hotel_name);
CREATE INDEX IF NOT EXISTS idx_medici_history_scraped ON medici_price_history(scraped_at);
CREATE INDEX IF NOT EXISTS idx_medici_history_price ON medici_price_history(price);

-- Comments for medici_price_history
COMMENT ON TABLE medici_price_history IS 'Historical Medici price data for trend analysis';

-- =============================================================================
-- Table: medici_sync_logs
-- Description: Track Medici API synchronization operations
-- =============================================================================

CREATE TABLE IF NOT EXISTS medici_sync_logs (
  id BIGSERIAL PRIMARY KEY,

  -- Sync details
  sync_type TEXT NOT NULL, -- 'opportunities', 'rooms', 'bookings', 'prices'
  operation TEXT NOT NULL, -- 'fetch', 'update', 'delete'

  -- Status
  status TEXT NOT NULL, -- 'success', 'failed', 'partial'

  -- Statistics
  records_processed INTEGER DEFAULT 0,
  records_success INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
  ) STORED,

  -- Error details
  error_message TEXT,
  error_details JSONB,

  -- Request details
  request_params JSONB,

  -- Response summary
  response_summary JSONB,

  -- Metadata
  metadata JSONB
);

-- Indexes for medici_sync_logs
CREATE INDEX IF NOT EXISTS idx_medici_sync_type ON medici_sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_medici_sync_status ON medici_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_medici_sync_started ON medici_sync_logs(started_at);

-- Comments for medici_sync_logs
COMMENT ON TABLE medici_sync_logs IS 'Audit log for Medici API synchronization operations';

-- =============================================================================
-- Row Level Security (Optional)
-- Uncomment if you want to enable RLS
-- =============================================================================

-- Enable RLS on all Medici tables
-- ALTER TABLE medici_opportunities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medici_active_rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medici_bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medici_price_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE medici_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
-- Users can only see data for their own hotels

-- CREATE POLICY "Users can view their hotel's opportunities"
--   ON medici_opportunities
--   FOR SELECT
--   USING (hotel_id IN (
--     SELECT id FROM hotels WHERE user_id = auth.uid()
--   ));

-- CREATE POLICY "Users can view their hotel's active rooms"
--   ON medici_active_rooms
--   FOR SELECT
--   USING (hotel_id IN (
--     SELECT id FROM hotels WHERE user_id = auth.uid()
--   ));

-- CREATE POLICY "Users can view their hotel's bookings"
--   ON medici_bookings
--   FOR SELECT
--   USING (hotel_id IN (
--     SELECT id FROM hotels WHERE user_id = auth.uid()
--   ));

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to calculate profit margin
CREATE OR REPLACE FUNCTION calculate_profit_margin(buy_price DECIMAL, push_price DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
  IF push_price = 0 THEN
    RETURN 0;
  END IF;
  RETURN ((push_price - buy_price) / push_price * 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get board type name
CREATE OR REPLACE FUNCTION get_board_type_name(board_id INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE board_id
    WHEN 1 THEN 'Room Only'
    WHEN 2 THEN 'Bed & Breakfast'
    WHEN 3 THEN 'Half Board'
    WHEN 4 THEN 'Full Board'
    WHEN 5 THEN 'All Inclusive'
    ELSE 'Unknown'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get category type name
CREATE OR REPLACE FUNCTION get_category_type_name(category_id INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE category_id
    WHEN 1 THEN 'Standard'
    WHEN 2 THEN 'Superior'
    WHEN 3 THEN 'Deluxe'
    WHEN 4 THEN 'Suite'
    WHEN 5 THEN 'Executive'
    ELSE 'Unknown'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- Sample Queries
-- =============================================================================

-- Query profitable opportunities
-- SELECT
--   hotel_name,
--   city,
--   start_date,
--   end_date,
--   buy_price,
--   push_price,
--   profit_margin,
--   available_rooms
-- FROM medici_opportunities
-- WHERE profit_margin > 20
--   AND available_rooms > 0
--   AND status = 'active'
-- ORDER BY profit_margin DESC;

-- Query active rooms with total costs
-- SELECT
--   hotel_name,
--   city,
--   start_date,
--   end_date,
--   nights,
--   total_buy_cost,
--   total_push_revenue,
--   total_push_revenue - total_buy_cost as total_profit,
--   profit_margin
-- FROM medici_active_rooms
-- WHERE status = 'active'
-- ORDER BY profit_margin DESC;

-- =============================================================================
-- Migration Complete
-- =============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Medici Hotels Integration - Migration 001 completed successfully';
  RAISE NOTICE 'Created tables: medici_opportunities, medici_active_rooms, medici_bookings, medici_price_history, medici_sync_logs';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Configure MEDICI_CLIENT_SECRET in your environment';
  RAISE NOTICE '2. Test connection with GET /api/medici/health';
  RAISE NOTICE '3. Start syncing data with POST /api/medici/sync';
END $$;
