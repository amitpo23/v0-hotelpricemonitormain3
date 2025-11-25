-- Hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  base_price DECIMAL(10, 2),
  competitor_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan configurations
CREATE TABLE IF NOT EXISTS scan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  room_type TEXT,
  guests INTEGER DEFAULT 2,
  frequency TEXT DEFAULT 'daily',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES scan_configs(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Scan results
CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  availability BOOLEAN DEFAULT true,
  room_type TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Price recommendations
CREATE TABLE IF NOT EXISTS price_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  recommended_price DECIMAL(10, 2) NOT NULL,
  confidence_score DECIMAL(3, 2),
  reasoning TEXT,
  market_average DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing alerts
CREATE TABLE IF NOT EXISTS pricing_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scan_results_hotel_id ON scan_results(hotel_id);
CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);
CREATE INDEX IF NOT EXISTS idx_scans_config_id ON scans(config_id);
CREATE INDEX IF NOT EXISTS idx_scan_configs_hotel_id ON scan_configs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_pricing_alerts_hotel_id ON pricing_alerts(hotel_id);
CREATE INDEX IF NOT EXISTS idx_price_recommendations_hotel_id ON price_recommendations(hotel_id);
