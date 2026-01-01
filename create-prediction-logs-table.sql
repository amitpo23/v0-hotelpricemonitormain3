-- Create prediction_logs table for detailed decision tracking
CREATE TABLE IF NOT EXISTS prediction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prediction reference
  hotel_id UUID NOT NULL REFERENCES hotels(id),
  prediction_date DATE NOT NULL,
  prediction_id UUID REFERENCES price_predictions(id),
  
  -- Metadata
  hotel_name TEXT,
  algorithm_version TEXT DEFAULT '3.2',
  execution_time_ms INTEGER,
  
  -- Multi-Agent Data
  multi_agent_data JSONB,
  -- Structure: {
  --   eventsFound: number,
  --   eventsConfidence: number,
  --   eventsList: Array<{name, date, impact}>,
  --   historicalData: number,
  --   historicalConfidence: number,
  --   historicalTrend: string,
  --   statisticsConfidence: number,
  --   marketAvgPrice: number,
  --   overallConfidence: number,
  --   dataQuality: string,
  --   executionTimeMs: number
  -- }
  
  -- Raw Input Data
  input_data JSONB,
  -- Structure: {
  --   basePrice: number,
  --   totalRooms: number,
  --   bookedRooms: number,
  --   scanResults: number,
  --   bookings: number,
  --   competitorPrices: number,
  --   competitorAvg: number,
  --   lastScanHoursAgo: number
  -- }
  
  -- Factor Calculations (detailed breakdown)
  factors JSONB,
  -- Structure: {
  --   seasonality: { value, label, impact, reasoning, calculation },
  --   weekendPremium: { value, isWeekend, impact, reasoning },
  --   leadTime: { value, days, impact, reasoning },
  --   occupancy: { value, rate, impact, reasoning },
  --   events: { value, eventsList, impact, reasoning },
  --   competitor: { value, avgPrice, impact, reasoning },
  --   budget: { value, gap, impact, reasoning },
  --   velocity: { value, trend, impact, reasoning }
  -- }
  
  -- Price Calculation (step by step)
  price_calculation JSONB,
  -- Structure: {
  --   rawPrice: number,
  --   priceBeforeFloors: number,
  --   floors: {
  --     absolute: number,
  --     competitor: number,
  --     govStats: number,
  --     currentPrice: number,
  --     applied: number
  --   },
  --   adjustments: Array<string>,
  --   floorApplied: boolean,
  --   finalPrice: number,
  --   roundingApplied: boolean
  -- }
  
  -- Confidence Calculation (detailed breakdown)
  confidence_calculation JSONB,
  -- Structure: {
  --   factors: {
  --     dataQuality: number,
  --     scanRecency: number,
  --     historicalData: number,
  --     bookingData: number,
  --     competitorData: number,
  --     marketConsistency: number,
  --     externalDataQuality: number
  --   },
  --   weights: { ... same keys, weight values },
  --   baseConfidence: number,
  --   adjustments: {
  --     timeDistance: number,
  --     eventBonus: boolean,
  --     historicalBonus: boolean,
  --     nearTermBonus: boolean
  --   },
  --   finalConfidence: number,
  --   daysUntilDate: number
  -- }
  
  -- Final Result
  result JSONB,
  -- Structure: {
  --   predictedPrice: number,
  --   basePrice: number,
  --   confidence: number,
  --   demand: string,
  --   priceVsBase: number,
  --   priceVsCompetitor: number,
  --   recommendation: string,
  --   recommendationType: string
  -- }
  
  -- Indexes for fast queries
  CONSTRAINT prediction_logs_hotel_date_unique UNIQUE(hotel_id, prediction_date, created_at)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prediction_logs_hotel_id ON prediction_logs(hotel_id);
CREATE INDEX IF NOT EXISTS idx_prediction_logs_prediction_date ON prediction_logs(prediction_date);
CREATE INDEX IF NOT EXISTS idx_prediction_logs_created_at ON prediction_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_logs_hotel_date ON prediction_logs(hotel_id, prediction_date);

-- Add RLS policies
ALTER TABLE prediction_logs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated users" ON prediction_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comments
COMMENT ON TABLE prediction_logs IS 'Detailed logs of prediction decision-making process for transparency and debugging';
COMMENT ON COLUMN prediction_logs.multi_agent_data IS 'Data collected from Multi-Agent System (Events, Historical, Statistics)';
COMMENT ON COLUMN prediction_logs.factors IS 'Detailed breakdown of all pricing factors and their impact';
COMMENT ON COLUMN prediction_logs.price_calculation IS 'Step-by-step price calculation with floors and adjustments';
COMMENT ON COLUMN prediction_logs.confidence_calculation IS 'Detailed confidence score calculation with all factors';
COMMENT ON COLUMN prediction_logs.result IS 'Final prediction result with recommendations';
