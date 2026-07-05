-- Reconstruction of the 16 core tables lost with the deleted Supabase project.
-- Column sets were extracted from actual code usage (inserts/selects/filters)
-- across app/ and lib/ — see docs/plan/phase0-schema-notes.md.

-- === Identity & access ===

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hotel_user_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, user_email)
);

-- === Hotel inventory ===

ALTER TABLE hotels ADD COLUMN IF NOT EXISTS total_rooms INTEGER;

CREATE TABLE IF NOT EXISTS hotel_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2),
  booking_url TEXT,
  expedia_url TEXT,
  agoda_url TEXT,
  hotels_com_url TEXT,
  display_color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT,
  total_rooms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_number TEXT,
  room_type_id UUID REFERENCES hotel_room_types(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Competitors ===

CREATE TABLE IF NOT EXISTS hotel_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  competitor_hotel_name TEXT NOT NULL,
  booking_url TEXT,
  expedia_url TEXT,
  competitor_url TEXT,
  star_rating INTEGER,
  notes TEXT,
  display_color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Legacy read-path used by competitor-agent; kept as a real table so reads
-- succeed (empty until Phase 1 decides whether to merge with hotel_competitors)
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  competitor_name TEXT,
  booking_url TEXT,
  expedia_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS competitor_room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID NOT NULL REFERENCES hotel_competitors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  booking_url TEXT,
  expedia_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- === Price history ===

CREATE TABLE IF NOT EXISTS competitor_daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES hotel_competitors(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  price NUMERIC(10,2),
  source TEXT NOT NULL DEFAULT 'booking',
  room_type TEXT NOT NULL DEFAULT '',
  room_name TEXT,
  availability BOOLEAN,
  original_price NUMERIC(10,2),
  meal_plan TEXT,
  max_occupancy INTEGER,
  raw_data JSONB,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, competitor_id, date, source, room_type)
);
CREATE INDEX IF NOT EXISTS idx_cdp_hotel_date ON competitor_daily_prices (hotel_id, date);

CREATE TABLE IF NOT EXISTS daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id UUID REFERENCES hotel_room_types(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  our_price NUMERIC(10,2),
  recommended_price NUMERIC(10,2),
  demand_level TEXT,
  avg_competitor_price NUMERIC(10,2),
  min_competitor_price NUMERIC(10,2),
  max_competitor_price NUMERIC(10,2),
  price_recommendation TEXT,
  autopilot_action TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dp_hotel_date ON daily_prices (hotel_id, date);

-- === Bookings (occupancy ground truth) ===

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE,
  room_type TEXT,
  room_number TEXT,
  room_count INTEGER DEFAULT 1,
  nights INTEGER,
  total_price NUMERIC(10,2),
  nightly_rate NUMERIC(10,2),
  guest_name TEXT,
  booking_source TEXT,
  booking_date DATE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_checkin ON bookings (hotel_id, check_in_date);

-- === Predictions & analytics ===

CREATE TABLE IF NOT EXISTS price_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  prediction_date DATE NOT NULL,
  predicted_price NUMERIC(10,2),
  predicted_demand TEXT,
  confidence_score NUMERIC(5,2),
  base_price NUMERIC(10,2),
  recommendation TEXT,
  recommendation_type TEXT,
  factors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, prediction_date)
);

CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  trend_date DATE,
  trend_type TEXT,
  trend_value NUMERIC(12,2),
  percentage_change NUMERIC(8,2),
  description TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  target_revenue NUMERIC(12,2),
  target_occupancy NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, year, month)
);

-- === Autopilot ===

CREATE TABLE IF NOT EXISTS autopilot_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  trigger_type TEXT,
  trigger_value JSONB,
  action_type TEXT,
  action_value JSONB,
  min_price NUMERIC(10,2),
  max_price NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autopilot_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES autopilot_rules(id) ON DELETE SET NULL,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  action_taken TEXT,
  old_price NUMERIC(10,2),
  new_price NUMERIC(10,2),
  trigger_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
