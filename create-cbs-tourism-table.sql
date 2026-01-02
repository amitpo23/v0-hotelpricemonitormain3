-- CBS (Central Bureau of Statistics) Tourism Data Table
-- Stores official and estimated tourism statistics for Israel

CREATE TABLE IF NOT EXISTS cbs_tourism_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Period identification
  period TEXT NOT NULL, -- 'YYYY-MM' format
  region TEXT NOT NULL, -- 'tel_aviv' | 'jerusalem' | 'eilat' | 'dead_sea' | 'national'
  
  -- National statistics
  total_arrivals INTEGER, -- Total tourist arrivals
  tourist_nights INTEGER, -- Total hotel nights
  avg_occupancy_rate NUMERIC(5,2), -- National average occupancy %
  avg_room_price NUMERIC(10,2), -- National average room price (ILS)
  
  -- Regional data (if available)
  regional_occupancy NUMERIC(5,2),
  regional_avg_price NUMERIC(10,2),
  
  -- Year-over-year comparison
  yoy_arrivals_growth NUMERIC(5,2), -- % growth
  yoy_occupancy_growth NUMERIC(5,2), -- % growth
  
  -- Data quality
  data_quality TEXT DEFAULT 'estimated', -- 'official' | 'estimated' | 'interpolated'
  source TEXT, -- 'data.gov.il' | 'cbs.gov.il' | 'model_estimate'
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT cbs_tourism_data_period_region UNIQUE(period, region)
);

CREATE INDEX IF NOT EXISTS idx_cbs_tourism_period ON cbs_tourism_data(period DESC);
CREATE INDEX IF NOT EXISTS idx_cbs_tourism_region ON cbs_tourism_data(region);
CREATE INDEX IF NOT EXISTS idx_cbs_tourism_quality ON cbs_tourism_data(data_quality);

COMMENT ON TABLE cbs_tourism_data IS 'Tourism statistics from Israel Central Bureau of Statistics';
COMMENT ON COLUMN cbs_tourism_data.period IS 'Month in YYYY-MM format';
COMMENT ON COLUMN cbs_tourism_data.data_quality IS 'official=from CBS API, estimated=model-based, interpolated=calculated';

-- Enable RLS
ALTER TABLE cbs_tourism_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON cbs_tourism_data
  FOR ALL USING (true) WITH CHECK (true);

-- Insert sample historical data (2024-2025)
INSERT INTO cbs_tourism_data (period, region, total_arrivals, tourist_nights, avg_occupancy_rate, avg_room_price, regional_occupancy, regional_avg_price, yoy_arrivals_growth, yoy_occupancy_growth, data_quality, source) VALUES
-- Tel Aviv 2024
('2024-01', 'tel_aviv', 280000, 700000, 72.5, 680, 78.0, 750, 5.2, 3.8, 'estimated', 'model_estimate'),
('2024-02', 'tel_aviv', 290000, 725000, 74.0, 690, 79.5, 760, 6.1, 4.2, 'estimated', 'model_estimate'),
('2024-03', 'tel_aviv', 350000, 875000, 78.5, 720, 84.0, 790, 8.3, 5.5, 'estimated', 'model_estimate'),
('2024-04', 'tel_aviv', 420000, 1050000, 85.0, 780, 90.0, 850, 12.5, 8.2, 'estimated', 'model_estimate'),
('2024-05', 'tel_aviv', 380000, 950000, 80.0, 740, 85.5, 810, 9.2, 6.1, 'estimated', 'model_estimate'),
('2024-06', 'tel_aviv', 330000, 825000, 75.0, 710, 80.0, 780, 7.1, 4.8, 'estimated', 'model_estimate'),
('2024-07', 'tel_aviv', 450000, 1125000, 88.0, 820, 92.5, 890, 14.2, 9.5, 'estimated', 'model_estimate'),
('2024-08', 'tel_aviv', 460000, 1150000, 89.5, 830, 94.0, 900, 15.1, 10.2, 'estimated', 'model_estimate'),
('2024-09', 'tel_aviv', 390000, 975000, 81.0, 760, 86.0, 830, 10.1, 6.8, 'estimated', 'model_estimate'),
('2024-10', 'tel_aviv', 400000, 1000000, 82.5, 770, 87.5, 840, 11.2, 7.5, 'estimated', 'model_estimate'),
('2024-11', 'tel_aviv', 320000, 800000, 73.5, 700, 78.5, 770, 6.5, 4.2, 'estimated', 'model_estimate'),
('2024-12', 'tel_aviv', 340000, 850000, 75.0, 710, 80.0, 780, 7.2, 4.8, 'estimated', 'model_estimate'),

-- Tel Aviv 2025
('2025-01', 'tel_aviv', 295000, 737500, 73.8, 695, 79.5, 765, 5.4, 4.0, 'estimated', 'model_estimate'),
('2025-02', 'tel_aviv', 305000, 762500, 75.2, 705, 81.0, 775, 5.2, 3.8, 'estimated', 'model_estimate'),
('2025-03', 'tel_aviv', 365000, 912500, 79.8, 735, 85.5, 805, 4.3, 3.2, 'estimated', 'model_estimate'),
('2025-04', 'tel_aviv', 435000, 1087500, 86.2, 795, 91.5, 865, 3.6, 2.8, 'estimated', 'model_estimate'),
('2025-05', 'tel_aviv', 395000, 987500, 81.2, 755, 87.0, 825, 3.9, 3.0, 'estimated', 'model_estimate'),
('2025-06', 'tel_aviv', 345000, 862500, 76.2, 725, 81.5, 795, 4.5, 3.5, 'estimated', 'model_estimate'),
('2025-07', 'tel_aviv', 465000, 1162500, 89.2, 835, 93.5, 905, 3.3, 2.5, 'estimated', 'model_estimate'),
('2025-08', 'tel_aviv', 475000, 1187500, 90.7, 845, 95.0, 915, 3.3, 2.4, 'estimated', 'model_estimate'),
('2025-09', 'tel_aviv', 405000, 1012500, 82.2, 775, 87.5, 845, 3.8, 2.9, 'estimated', 'model_estimate'),
('2025-10', 'tel_aviv', 415000, 1037500, 83.7, 785, 89.0, 855, 3.8, 2.8, 'estimated', 'model_estimate'),
('2025-11', 'tel_aviv', 335000, 837500, 74.7, 715, 80.0, 785, 4.7, 3.6, 'estimated', 'model_estimate'),
('2025-12', 'tel_aviv', 355000, 887500, 76.2, 725, 81.5, 795, 4.4, 3.4, 'estimated', 'model_estimate'),

-- National Average 2025
('2025-01', 'national', 850000, 2125000, 68.0, 580, NULL, NULL, 5.1, 3.5, 'estimated', 'model_estimate'),
('2025-02', 'national', 870000, 2175000, 69.5, 590, NULL, NULL, 4.8, 3.2, 'estimated', 'model_estimate'),
('2025-03', 'national', 1050000, 2625000, 73.5, 615, NULL, NULL, 4.0, 2.9, 'estimated', 'model_estimate'),
('2025-04', 'national', 1250000, 3125000, 79.5, 665, NULL, NULL, 3.3, 2.5, 'estimated', 'model_estimate'),
('2025-05', 'national', 1150000, 2875000, 75.0, 635, NULL, NULL, 3.6, 2.7, 'estimated', 'model_estimate'),
('2025-06', 'national', 1000000, 2500000, 70.5, 605, NULL, NULL, 4.2, 3.2, 'estimated', 'model_estimate'),
('2025-07', 'national', 1350000, 3375000, 82.5, 700, NULL, NULL, 3.1, 2.3, 'estimated', 'model_estimate'),
('2025-08', 'national', 1375000, 3437500, 83.5, 710, NULL, NULL, 3.0, 2.2, 'estimated', 'model_estimate'),
('2025-09', 'national', 1180000, 2950000, 76.0, 650, NULL, NULL, 3.5, 2.7, 'estimated', 'model_estimate'),
('2025-10', 'national', 1200000, 3000000, 77.0, 660, NULL, NULL, 3.5, 2.6, 'estimated', 'model_estimate'),
('2025-11', 'national', 970000, 2425000, 71.0, 615, NULL, NULL, 4.5, 3.4, 'estimated', 'model_estimate'),
('2025-12', 'national', 1020000, 2550000, 72.5, 625, NULL, NULL, 4.2, 3.2, 'estimated', 'model_estimate');

-- Success message
SELECT 
  'CBS Tourism Data table created and populated!' as message,
  COUNT(*) as total_records,
  COUNT(DISTINCT period) as periods,
  COUNT(DISTINCT region) as regions
FROM cbs_tourism_data;
