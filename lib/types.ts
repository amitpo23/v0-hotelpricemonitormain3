export interface Hotel {
  id: string
  name: string
  location: string | null
  base_price: number | null
  competitor_urls: string[] | null
  created_at: string
  updated_at: string
}

export interface ScanConfig {
  id: string
  hotel_id: string
  check_in_date: string
  check_out_date: string
  room_type: string | null
  guests: number
  frequency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Scan {
  id: string
  config_id: string
  status: string
  started_at: string
  completed_at: string | null
  error_message: string | null
}

export interface ScanResult {
  id: string
  scan_id: string
  hotel_id: string
  source: string
  price: number
  currency: string
  availability: boolean
  room_type: string | null
  scraped_at: string
  metadata: Record<string, any> | null
}

export interface PriceRecommendation {
  id: string
  hotel_id: string
  recommended_price: number
  confidence_score: number | null
  reasoning: string | null
  market_average: number | null
  created_at: string
}

export interface PricingAlert {
  id: string
  hotel_id: string
  alert_type: string
  message: string
  severity: string
  is_read: boolean
  created_at: string
}

export interface AutopilotRule {
  id: string
  hotel_id: string
  name: string
  is_active: boolean
  trigger_type: "competitor_undercut" | "occupancy_threshold" | "date_range" | "demand_spike"
  trigger_value: Record<string, any>
  action_type: "adjust_price" | "send_alert" | "match_competitor"
  action_value: Record<string, any>
  min_price: number | null
  max_price: number | null
  max_daily_changes: number
  target_revenue: number | null
  target_occupancy: number | null
  priority: number
  created_at: string
  updated_at: string
}

export interface PricePrediction {
  id: string
  hotel_id: string
  prediction_date: string
  predicted_price: number
  predicted_demand: "low" | "medium" | "high" | "very_high" | null
  confidence_score: number | null
  factors: {
    events?: string[]
    seasonality?: string
    competitor_avg?: number
    day_of_week?: string
    historical_trend?: string
  } | null
  created_at: string
}

export interface AutopilotLog {
  id: string
  rule_id: string
  hotel_id: string
  action_taken: string
  old_price: number | null
  new_price: number | null
  trigger_data: Record<string, any> | null
  executed_at: string
}

export interface MarketTrend {
  id: string
  hotel_id: string
  trend_date: string
  trend_type: "price_increase" | "price_decrease" | "demand_spike" | "competitor_change"
  trend_value: number | null
  percentage_change: number | null
  description: string | null
  detected_at: string
}

export interface RevenueTracking {
  id: string
  hotel_id: string
  date: string
  revenue: number
  bookings: number
  average_price: number | null
  occupancy_rate: number | null
  created_at: string
}

export interface RegionalMarketData {
  id: string
  region: string
  city: string
  date: string
  avg_hotel_price: number | null
  avg_occupancy_rate: number | null
  total_hotels_tracked: number | null
  demand_level: "low" | "medium" | "high" | "peak" | null
  events: { name: string; date: string; impact: string }[] | null
  weather_impact: string | null
  created_at: string
}

export interface CompetitorData {
  id: string
  hotel_id: string
  competitor_name: string
  competitor_url: string | null
  price: number
  availability: boolean
  rating: number | null
  review_count: number | null
  room_type: string | null
  scraped_at: string
  metadata: Record<string, any> | null
}

export interface HistoricalPerformance {
  id: string
  hotel_id: string
  period_start: string
  period_end: string
  total_revenue: number | null
  total_bookings: number | null
  avg_daily_rate: number | null
  revpar: number | null
  occupancy_rate: number | null
  market_share: number | null
  competitor_rank: number | null
  created_at: string
}

export interface DemandFactor {
  id: string
  region: string
  date: string
  factor_type: "event" | "holiday" | "season" | "weather" | "economic"
  factor_name: string
  impact_score: number | null
  description: string | null
  source_url: string | null
  created_at: string
}

export interface PriceOptimizationHistory {
  id: string
  hotel_id: string
  date: string
  original_price: number | null
  optimized_price: number | null
  optimization_reason: string | null
  factors_considered: Record<string, any> | null
  actual_bookings: number | null
  expected_bookings: number | null
  performance_score: number | null
  created_at: string
}
