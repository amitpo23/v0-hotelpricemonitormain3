/**
 * CBS (Central Bureau of Statistics) Integration
 * Fetches real tourism data from Israel's official statistics bureau
 * 
 * Data sources:
 * 1. data.gov.il - Israeli open data portal
 * 2. CBS official API
 * 3. Tourism statistics (occupancy, arrivals, avg prices)
 */

import { createClient } from '@/lib/supabase/server'

interface CBSToiurismData {
  period: string // YYYY-MM
  region: string // 'tel_aviv' | 'jerusalem' | 'eilat' | 'dead_sea' | 'national'
  
  // National statistics
  totalArrivals: number // Total tourist arrivals
  touristNights: number // Total hotel nights
  avgOccupancyRate: number // National average occupancy %
  avgRoomPrice: number // National average room price (ILS)
  
  // Regional data
  regionalOccupancy?: number
  regionalAvgPrice?: number
  
  // Year-over-year comparison
  yoyArrivalsGrowth: number // % growth
  yoyOccupancyGrowth: number // % growth
  
  // Confidence
  dataQuality: 'official' | 'estimated' | 'interpolated'
  lastUpdated: string
  source: string
}

interface CBSMarketTrends {
  currentMonth: CBSToiurismData
  previousMonth: CBSToiurismData
  sameMonthLastYear: CBSToiurismData
  trend: 'strong_growth' | 'moderate_growth' | 'stable' | 'declining'
  seasonalFactor: number // Multiplier relative to annual average
  confidence: number
}

/**
 * Fetch CBS tourism data from data.gov.il API
 * Note: This is a real integration - requires API key from data.gov.il
 */
async function fetchCBSData(
  period: string, // YYYY-MM
  region: string = 'tel_aviv'
): Promise<CBSToiurismData | null> {
  try {
    // Check if we have cached data
    const supabase = await createClient()
    
    const { data: cached } = await supabase
      .from('cbs_tourism_data')
      .select('*')
      .eq('period', period)
      .eq('region', region)
      .single()
    
    if (cached && cached.data_quality === 'official') {
      console.log(`[CBS] Using cached data for ${period} ${region}`)
      return {
        period: cached.period,
        region: cached.region,
        totalArrivals: cached.total_arrivals,
        touristNights: cached.tourist_nights,
        avgOccupancyRate: cached.avg_occupancy_rate,
        avgRoomPrice: cached.avg_room_price,
        regionalOccupancy: cached.regional_occupancy,
        regionalAvgPrice: cached.regional_avg_price,
        yoyArrivalsGrowth: cached.yoy_arrivals_growth,
        yoyOccupancyGrowth: cached.yoy_occupancy_growth,
        dataQuality: cached.data_quality,
        lastUpdated: cached.last_updated,
        source: cached.source
      }
    }
    
    // Try to fetch from data.gov.il (requires API key)
    const dataGovApiKey = process.env.DATA_GOV_IL_API_KEY
    
    if (!dataGovApiKey) {
      console.log('[CBS] No data.gov.il API key - using estimates')
      return generateEstimatedCBSData(period, region)
    }
    
    // Real API call to data.gov.il
    const response = await fetch(
      `https://data.gov.il/api/3/action/datastore_search?resource_id=tourism_statistics&filters={"period":"${period}","region":"${region}"}`,
      {
        headers: {
          'Authorization': dataGovApiKey
        }
      }
    )
    
    if (!response.ok) {
      console.log(`[CBS] API error: ${response.status}`)
      return generateEstimatedCBSData(period, region)
    }
    
    const json = await response.json()
    
    if (json.success && json.result.records.length > 0) {
      const record = json.result.records[0]
      
      const cbsData: CBSToiurismData = {
        period,
        region,
        totalArrivals: record.arrivals || 0,
        touristNights: record.nights || 0,
        avgOccupancyRate: record.occupancy || 65,
        avgRoomPrice: record.avg_price || 550,
        regionalOccupancy: record.regional_occupancy,
        regionalAvgPrice: record.regional_price,
        yoyArrivalsGrowth: record.yoy_growth || 0,
        yoyOccupancyGrowth: record.occupancy_growth || 0,
        dataQuality: 'official',
        lastUpdated: new Date().toISOString(),
        source: 'data.gov.il'
      }
      
      // Cache the data
      await cacheCBSData(cbsData)
      
      return cbsData
    }
    
    return generateEstimatedCBSData(period, region)
    
  } catch (error) {
    console.error('[CBS] Error fetching data:', error)
    return generateEstimatedCBSData(period, region)
  }
}

/**
 * Generate estimated CBS data based on historical patterns
 * Used as fallback when official data is not available
 */
function generateEstimatedCBSData(
  period: string,
  region: string
): CBSToiurismData {
  const [year, month] = period.split('-').map(Number)
  
  // Seasonal patterns for Israel tourism
  const seasonalFactors: Record<number, number> = {
    1: 0.85,  // January - Winter, lower tourism
    2: 0.90,  // February
    3: 1.05,  // March - Spring, Purim
    4: 1.20,  // April - Passover, high season
    5: 1.10,  // May
    6: 0.95,  // June - Summer starts
    7: 1.25,  // July - Peak summer
    8: 1.30,  // August - Peak summer
    9: 1.10,  // September - Jewish holidays
    10: 1.15, // October - Sukkot
    11: 0.95, // November
    12: 1.00  // December - Hanukkah
  }
  
  const seasonalFactor = seasonalFactors[month] || 1.0
  
  // Base statistics (2024-2025 estimates)
  const baseOccupancy = 68 // National average
  const basePrice = 580 // ILS average
  const baseArrivals = 350000 // Monthly average
  
  // Regional adjustments
  const regionalFactors: Record<string, { occupancy: number; price: number }> = {
    tel_aviv: { occupancy: 1.15, price: 1.30 },
    jerusalem: { occupancy: 1.05, price: 1.10 },
    eilat: { occupancy: 1.10, price: 0.95 },
    dead_sea: { occupancy: 0.95, price: 1.25 },
    national: { occupancy: 1.00, price: 1.00 }
  }
  
  const regional = regionalFactors[region] || regionalFactors.national
  
  return {
    period,
    region,
    totalArrivals: Math.round(baseArrivals * seasonalFactor),
    touristNights: Math.round(baseArrivals * seasonalFactor * 2.5), // Avg 2.5 nights
    avgOccupancyRate: Math.round(baseOccupancy * seasonalFactor * 10) / 10,
    avgRoomPrice: Math.round(basePrice * seasonalFactor),
    regionalOccupancy: Math.round(baseOccupancy * seasonalFactor * regional.occupancy * 10) / 10,
    regionalAvgPrice: Math.round(basePrice * seasonalFactor * regional.price),
    yoyArrivalsGrowth: 5.0 + (Math.random() * 10 - 5), // 0-10% growth
    yoyOccupancyGrowth: 3.0 + (Math.random() * 6 - 3), // 0-6% growth
    dataQuality: 'estimated',
    lastUpdated: new Date().toISOString(),
    source: 'model_estimate'
  }
}

/**
 * Cache CBS data to database
 */
async function cacheCBSData(data: CBSToiurismData): Promise<void> {
  try {
    const supabase = await createClient()
    
    await supabase.from('cbs_tourism_data').upsert({
      period: data.period,
      region: data.region,
      total_arrivals: data.totalArrivals,
      tourist_nights: data.touristNights,
      avg_occupancy_rate: data.avgOccupancyRate,
      avg_room_price: data.avgRoomPrice,
      regional_occupancy: data.regionalOccupancy,
      regional_avg_price: data.regionalAvgPrice,
      yoy_arrivals_growth: data.yoyArrivalsGrowth,
      yoy_occupancy_growth: data.yoyOccupancyGrowth,
      data_quality: data.dataQuality,
      last_updated: data.lastUpdated,
      source: data.source
    }, {
      onConflict: 'period,region'
    })
    
    console.log(`[CBS] Cached data for ${data.period} ${data.region}`)
    
  } catch (error) {
    console.error('[CBS] Error caching data:', error)
  }
}

/**
 * Analyze market trends from CBS data
 */
export async function analyzeCBSMarketTrends(
  date: Date,
  region: string = 'tel_aviv'
): Promise<CBSMarketTrends> {
  try {
    const currentPeriod = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    const prevMonth = new Date(date)
    prevMonth.setMonth(prevMonth.getMonth() - 1)
    const prevPeriod = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
    
    const lastYear = new Date(date)
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    const lastYearPeriod = `${lastYear.getFullYear()}-${String(lastYear.getMonth() + 1).padStart(2, '0')}`
    
    // Fetch all three periods in parallel
    const [currentMonth, previousMonth, sameMonthLastYear] = await Promise.all([
      fetchCBSData(currentPeriod, region),
      fetchCBSData(prevPeriod, region),
      fetchCBSData(lastYearPeriod, region)
    ])
    
    if (!currentMonth || !previousMonth || !sameMonthLastYear) {
      throw new Error('Failed to fetch CBS data')
    }
    
    // Determine trend
    const momGrowth = ((currentMonth.avgOccupancyRate - previousMonth.avgOccupancyRate) / previousMonth.avgOccupancyRate) * 100
    const yoyGrowth = currentMonth.yoyOccupancyGrowth
    
    let trend: CBSMarketTrends['trend'] = 'stable'
    if (yoyGrowth > 8 || momGrowth > 5) {
      trend = 'strong_growth'
    } else if (yoyGrowth > 3 || momGrowth > 2) {
      trend = 'moderate_growth'
    } else if (yoyGrowth < -5 || momGrowth < -3) {
      trend = 'declining'
    }
    
    // Calculate seasonal factor
    const annualAvg = 68 // Base occupancy
    const seasonalFactor = currentMonth.avgOccupancyRate / annualAvg
    
    // Confidence based on data quality
    const confidence = 
      currentMonth.dataQuality === 'official' ? 0.95 :
      currentMonth.dataQuality === 'estimated' ? 0.70 : 0.50
    
    return {
      currentMonth,
      previousMonth,
      sameMonthLastYear,
      trend,
      seasonalFactor,
      confidence
    }
    
  } catch (error) {
    console.error('[CBS] Error analyzing trends:', error)
    throw error
  }
}

/**
 * Get pricing recommendation based on CBS data
 */
export function getCBSPricingRecommendation(
  trends: CBSMarketTrends,
  hotelCurrentPrice: number
): {
  recommendedPriceMultiplier: number
  reasoning: string
  confidence: number
} {
  const { currentMonth, trend, seasonalFactor, confidence } = trends
  
  let multiplier = 1.0
  const reasons: string[] = []
  
  // Compare with national average
  const priceVsMarket = hotelCurrentPrice / currentMonth.avgRoomPrice
  
  if (priceVsMarket < 0.85) {
    multiplier += 0.05
    reasons.push('מחירך נמוך מהשוק הלאומי - אפשר להעלות')
  } else if (priceVsMarket > 1.15) {
    multiplier -= 0.03
    reasons.push('מחירך גבוה מהשוק - זהיר עם העלאות')
  }
  
  // Market trend
  if (trend === 'strong_growth') {
    multiplier += 0.06
    reasons.push(`שוק חזק (+${currentMonth.yoyOccupancyGrowth.toFixed(1)}% YoY)`)
  } else if (trend === 'moderate_growth') {
    multiplier += 0.03
    reasons.push('צמיחה מתונה בשוק')
  } else if (trend === 'declining') {
    multiplier -= 0.05
    reasons.push('שוק יורד - היזהר')
  }
  
  // Seasonal factor
  if (seasonalFactor > 1.15) {
    multiplier += 0.04
    reasons.push('עונת שיא (CBS)')
  } else if (seasonalFactor < 0.90) {
    multiplier -= 0.02
    reasons.push('עונה חלשה')
  }
  
  // Regional occupancy
  if (currentMonth.regionalOccupancy && currentMonth.regionalOccupancy > 75) {
    multiplier += 0.03
    reasons.push(`תפוסה אזורית גבוהה (${currentMonth.regionalOccupancy}%)`)
  }
  
  multiplier = Math.max(0.92, Math.min(1.12, multiplier))
  
  return {
    recommendedPriceMultiplier: multiplier,
    reasoning: reasons.join('. '),
    confidence: confidence * 0.85 // CBS data is external, reduce confidence slightly
  }
}

/**
 * Export for use in prediction system
 */
export async function getCBSDataForPrediction(
  date: Date,
  region: string = 'tel_aviv'
): Promise<{
  marketData: CBSMarketTrends
  pricingImpact: number
  confidence: number
  reasoning: string
} | null> {
  try {
    const trends = await analyzeCBSMarketTrends(date, region)
    const hotelAvgPrice = 550 // Default, should be passed as parameter
    
    const recommendation = getCBSPricingRecommendation(trends, hotelAvgPrice)
    
    return {
      marketData: trends,
      pricingImpact: recommendation.recommendedPriceMultiplier,
      confidence: recommendation.confidence,
      reasoning: recommendation.reasoning
    }
    
  } catch (error) {
    console.error('[CBS] Error getting data for prediction:', error)
    return null
  }
}
