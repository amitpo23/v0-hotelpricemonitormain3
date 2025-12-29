# Medici Hotels - Database Schema Extensions

This document outlines the database schema extensions needed to fully support Medici Hotels API integration.

## Overview

The Medici integration can work with existing tables (`competitor_daily_prices`, `hotel_competitors`) but additional tables can enhance functionality.

## Option 1: Use Existing Tables (Recommended for Quick Start)

The Medici integration can use existing tables without modifications:

### `competitor_daily_prices`
Store Medici prices as competitor data:

```sql
-- Existing table structure - no changes needed
-- Just add 'medici' as a source value
```

**Usage:**
- Set `source = 'medici'`
- Store hotel name in `metadata.hotel_name`
- Store Medici-specific data in `metadata` JSONB column

### `hotel_competitors`
Add Medici as a competitor:

```sql
INSERT INTO hotel_competitors (hotel_id, competitor_name, competitor_url, is_active)
VALUES (your_hotel_id, 'Medici Hotels', 'https://medici-backend.azurewebsites.net', true);
```

## Option 2: Dedicated Medici Tables (Recommended for Full Integration)

### Table: `medici_opportunities`

Store Medici opportunities for tracking and analysis.

```sql
CREATE TABLE medici_opportunities (
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

  -- Indexes
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_prices CHECK (push_price >= buy_price),
  CONSTRAINT valid_rooms CHECK (max_rooms > 0)
);

-- Indexes for performance
CREATE INDEX idx_medici_opp_hotel_id ON medici_opportunities(hotel_id);
CREATE INDEX idx_medici_opp_dates ON medici_opportunities(start_date, end_date);
CREATE INDEX idx_medici_opp_city ON medici_opportunities(city);
CREATE INDEX idx_medici_opp_status ON medici_opportunities(status);
CREATE INDEX idx_medici_opp_profit ON medici_opportunities(profit_margin);
CREATE INDEX idx_medici_opp_synced ON medici_opportunities(synced_at);
```

### Table: `medici_active_rooms`

Store Medici active (purchased) rooms.

```sql
CREATE TABLE medici_active_rooms (
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
  CONSTRAINT valid_dates CHECK (end_date > start_date),
  CONSTRAINT valid_prices CHECK (push_price >= buy_price)
);

-- Indexes
CREATE INDEX idx_medici_rooms_hotel_id ON medici_active_rooms(hotel_id);
CREATE INDEX idx_medici_rooms_dates ON medici_active_rooms(start_date, end_date);
CREATE INDEX idx_medici_rooms_city ON medici_active_rooms(city);
CREATE INDEX idx_medici_rooms_status ON medici_active_rooms(status);
CREATE INDEX idx_medici_rooms_prebook ON medici_active_rooms(prebook_id);
```

### Table: `medici_bookings`

Store Medici bookings (sales).

```sql
CREATE TABLE medici_bookings (
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
  CONSTRAINT valid_dates CHECK (check_out > check_in)
);

-- Indexes
CREATE INDEX idx_medici_bookings_hotel_id ON medici_bookings(hotel_id);
CREATE INDEX idx_medici_bookings_dates ON medici_bookings(check_in, check_out);
CREATE INDEX idx_medici_bookings_status ON medici_bookings(status);
CREATE INDEX idx_medici_bookings_confirmation ON medici_bookings(confirmation_code);
CREATE INDEX idx_medici_bookings_prebook ON medici_bookings(prebook_id);
```

### Table: `medici_price_history`

Store historical Medici search results for trend analysis.

```sql
CREATE TABLE medici_price_history (
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

-- Indexes
CREATE INDEX idx_medici_history_city_dates ON medici_price_history(city, check_in, check_out);
CREATE INDEX idx_medici_history_hotel ON medici_price_history(hotel_name);
CREATE INDEX idx_medici_history_scraped ON medici_price_history(scraped_at);
CREATE INDEX idx_medici_history_price ON medici_price_history(price);
```

### Table: `medici_sync_logs`

Track Medici API synchronization operations.

```sql
CREATE TABLE medici_sync_logs (
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

-- Indexes
CREATE INDEX idx_medici_sync_type ON medici_sync_logs(sync_type);
CREATE INDEX idx_medici_sync_status ON medici_sync_logs(status);
CREATE INDEX idx_medici_sync_started ON medici_sync_logs(started_at);
```

## Integration Patterns

### Pattern 1: Competitor Price Tracking

Use Medici as a competitor data source:

```sql
-- Add Medici as a competitor
INSERT INTO hotel_competitors (hotel_id, competitor_name, competitor_url, is_active)
VALUES (1, 'Medici Hotels', 'https://medici-backend.azurewebsites.net', true);

-- Store Medici prices in competitor_daily_prices
-- This is handled automatically by the API endpoint: POST /api/medici/sync
```

### Pattern 2: Opportunity Management

Track Medici opportunities separately:

```sql
-- Query profitable opportunities
SELECT
  hotel_name,
  city,
  start_date,
  end_date,
  buy_price,
  push_price,
  profit_margin,
  available_rooms
FROM medici_opportunities
WHERE profit_margin > 20
  AND available_rooms > 0
  AND status = 'active'
ORDER BY profit_margin DESC;
```

### Pattern 3: Market Analysis

Analyze Medici market data:

```sql
-- Get average Medici prices by city
SELECT
  city,
  check_in::date,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price,
  COUNT(*) as hotel_count
FROM medici_price_history
WHERE scraped_at > NOW() - INTERVAL '7 days'
GROUP BY city, check_in::date
ORDER BY city, check_in;
```

## Row Level Security (RLS)

If using RLS, add policies for Medici tables:

```sql
-- Enable RLS
ALTER TABLE medici_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE medici_active_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE medici_bookings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their hotel's data
CREATE POLICY "Users can view their hotel's Medici data"
  ON medici_opportunities
  FOR SELECT
  USING (hotel_id IN (
    SELECT id FROM hotels WHERE user_id = auth.uid()
  ));

-- Add similar policies for other tables
```

## Recommended Approach

**For Quick Start:**
1. Use existing `competitor_daily_prices` table
2. Use API endpoints: `/api/medici/search`, `/api/medici/sync`
3. No schema changes required

**For Full Integration:**
1. Create dedicated Medici tables (run SQL above)
2. Implement sync jobs to populate tables
3. Build analytics dashboards using Medici data

## Migration Script

See `migrations/001_medici_tables.sql` for complete migration.

## Next Steps

1. Choose integration approach (existing tables vs. dedicated tables)
2. Run migrations if using dedicated tables
3. Configure environment variables
4. Test with `/api/medici/health` endpoint
5. Start syncing data with `/api/medici/sync` endpoint
