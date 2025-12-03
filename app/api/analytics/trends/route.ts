import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { detectTrend, calculateEMA, detectSeasonality, analyzeBookingPace, type PricePoint } from "@/lib/advanced-predictions"

/**
 * Advanced Trend Analysis API
 * Provides insights into price trends, booking patterns, and market dynamics
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get("hotelId")

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId parameter required" }, { status: 400 })
    }

    const today = new Date()
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Fetch historical data
    const [
      { data: historicalPrices },
      { data: competitorPrices },
      { data: bookings },
      { data: revenueTracking },
      { data: hotel },
    ] = await Promise.all([
      supabase
        .from("daily_prices")
        .select("*")
        .eq("hotel_id", hotelId)
        .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true }),

      supabase
        .from("competitor_daily_prices")
        .select("*")
        .eq("hotel_id", hotelId)
        .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true }),

      supabase
        .from("bookings")
        .select("*")
        .eq("hotel_id", hotelId)
        .gte("created_at", ninetyDaysAgo.toISOString())
        .eq("status", "confirmed"),

      supabase
        .from("revenue_tracking")
        .select("*")
        .eq("hotel_id", hotelId)
        .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true }),

      supabase.from("hotels").select("*").eq("id", hotelId).single(),
    ])

    if (!hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    // Prepare price points
    const pricePoints: PricePoint[] =
      historicalPrices?.map((hp: any) => ({
        date: hp.date,
        price: hp.our_price || hp.recommended_price,
        occupancy: 0,
        demand: hp.demand_level,
      })) || []

    // Analyze our price trend
    const ourPrices = pricePoints.map((p) => p.price).filter((p) => p > 0)
    const ourPriceTrend = ourPrices.length >= 7 ? detectTrend(ourPrices, 14) : null

    // Analyze recent trend (last 7 days)
    const recentPriceTrend = ourPrices.length >= 7 ? detectTrend(ourPrices, 7) : null

    // Analyze competitor price trend
    const competitorPricesByDate: Record<string, number[]> = {}
    competitorPrices?.forEach((cp: any) => {
      if (!competitorPricesByDate[cp.date]) competitorPricesByDate[cp.date] = []
      if (cp.price > 0) competitorPricesByDate[cp.date].push(cp.price)
    })

    const competitorAvgPrices = Object.values(competitorPricesByDate)
      .map((prices) => prices.reduce((a, b) => a + b, 0) / prices.length)
      .filter((p) => p > 0)

    const competitorTrend = competitorAvgPrices.length >= 7 ? detectTrend(competitorAvgPrices, 14) : null

    // Detect seasonality
    const seasonality = pricePoints.length >= 30 ? detectSeasonality(pricePoints) : null

    // Calculate EMA
    const ema7 = ourPrices.length >= 7 ? calculateEMA(ourPrices, 7) : []
    const ema30 = ourPrices.length >= 30 ? calculateEMA(ourPrices, 30) : []

    // Analyze booking pace
    const bookingsByWeek: Record<string, number> = {}
    bookings?.forEach((b: any) => {
      const createdDate = new Date(b.created_at)
      const weekStart = new Date(createdDate)
      weekStart.setDate(createdDate.getDate() - createdDate.getDay())
      const weekKey = weekStart.toISOString().split("T")[0]

      bookingsByWeek[weekKey] = (bookingsByWeek[weekKey] || 0) + 1
    })

    const weeklyBookingCounts = Object.values(bookingsByWeek)
    const bookingTrend = weeklyBookingCounts.length >= 3 ? detectTrend(weeklyBookingCounts, 4) : null

    // Calculate revenue trend
    const revenues = revenueTracking?.map((rt: any) => rt.revenue || 0).filter((r) => r > 0) || []
    const revenueTrend = revenues.length >= 7 ? detectTrend(revenues, 14) : null

    // Price positioning analysis
    const recentOurPrices = ourPrices.slice(-7)
    const recentCompetitorPrices = competitorAvgPrices.slice(-7)

    const avgOurPrice = recentOurPrices.length > 0 ? recentOurPrices.reduce((a, b) => a + b, 0) / recentOurPrices.length : 0
    const avgCompPrice =
      recentCompetitorPrices.length > 0
        ? recentCompetitorPrices.reduce((a, b) => a + b, 0) / recentCompetitorPrices.length
        : avgOurPrice

    const pricePositioning = avgOurPrice / avgCompPrice

    let positioningLabel = "at_market"
    if (pricePositioning > 1.1) positioningLabel = "premium"
    else if (pricePositioning > 1.05) positioningLabel = "slightly_above"
    else if (pricePositioning < 0.9) positioningLabel = "discount"
    else if (pricePositioning < 0.95) positioningLabel = "slightly_below"

    // Generate insights
    const insights = []

    if (ourPriceTrend) {
      if (ourPriceTrend.direction === "up" && ourPriceTrend.strength > 0.5) {
        insights.push({
          type: "price_trend",
          severity: "info",
          message: `Your prices are trending ${ourPriceTrend.direction} with ${Math.round(ourPriceTrend.strength * 100)}% strength`,
          recommendation: "Monitor market response and competitor reactions",
        })
      } else if (ourPriceTrend.direction === "down" && ourPriceTrend.strength > 0.5) {
        insights.push({
          type: "price_trend",
          severity: "warning",
          message: `Your prices are trending down significantly (${Math.round(ourPriceTrend.strength * 100)}% strength)`,
          recommendation: "Consider reviewing your pricing strategy or checking if market conditions have changed",
        })
      }
    }

    if (competitorTrend && ourPriceTrend) {
      if (
        competitorTrend.direction === "up" &&
        ourPriceTrend.direction !== "up" &&
        competitorTrend.strength > 0.4
      ) {
        insights.push({
          type: "market_divergence",
          severity: "opportunity",
          message: "Competitors are raising prices while yours remain stable",
          recommendation: "Consider increasing prices to maximize revenue",
        })
      } else if (
        competitorTrend.direction === "down" &&
        ourPriceTrend.direction !== "down" &&
        competitorTrend.strength > 0.4
      ) {
        insights.push({
          type: "market_divergence",
          severity: "warning",
          message: "Competitors are lowering prices while yours remain stable",
          recommendation: "Review competitor positioning and consider price adjustment to remain competitive",
        })
      }
    }

    if (positioningLabel === "premium" && bookingTrend?.direction === "down") {
      insights.push({
        type: "pricing_mismatch",
        severity: "warning",
        message: "Premium pricing with declining bookings",
        recommendation: "Consider moderate price reduction to stimulate demand",
      })
    } else if (positioningLabel === "discount" && bookingTrend?.direction === "up") {
      insights.push({
        type: "pricing_opportunity",
        severity: "opportunity",
        message: "Strong booking pace at discount prices",
        recommendation: "Opportunity to gradually increase prices while maintaining demand",
      })
    }

    if (seasonality && seasonality.amplitude > 0.6) {
      const patternLabel = seasonality.period === 7 ? "weekly" : seasonality.period === 30 ? "monthly" : "periodic"
      insights.push({
        type: "seasonality",
        severity: "info",
        message: `Strong ${patternLabel} pattern detected (${Math.round(seasonality.amplitude * 100)}% strength)`,
        recommendation: "Use seasonal patterns to optimize pricing for peak and off-peak periods",
      })
    }

    // Performance metrics
    const performanceMetrics = {
      price_volatility: ourPrices.length > 1 ? calculateVolatility(ourPrices) : 0,
      competitor_price_gap: avgOurPrice - avgCompPrice,
      competitor_price_gap_percent: Math.round(((avgOurPrice - avgCompPrice) / avgCompPrice) * 100),
      booking_velocity: bookingTrend
        ? {
            direction: bookingTrend.direction,
            change_percent: Math.round(bookingTrend.velocity * 100),
          }
        : null,
      revenue_velocity: revenueTrend
        ? {
            direction: revenueTrend.direction,
            change_percent: Math.round(revenueTrend.velocity * 100),
          }
        : null,
    }

    // Recommendations based on all factors
    const recommendations = generateRecommendations(
      ourPriceTrend,
      competitorTrend,
      bookingTrend,
      positioningLabel,
      performanceMetrics,
    )

    return NextResponse.json({
      success: true,
      hotel_id: hotelId,
      hotel_name: hotel.name,
      analysis_period: {
        start: ninetyDaysAgo.toISOString().split("T")[0],
        end: today.toISOString().split("T")[0],
        days: 90,
      },
      trends: {
        our_price: ourPriceTrend
          ? {
              direction: ourPriceTrend.direction,
              strength: Math.round(ourPriceTrend.strength * 100),
              confidence: Math.round(ourPriceTrend.confidence * 100),
              velocity_percent: Math.round(ourPriceTrend.velocity * 100),
            }
          : null,
        recent_price: recentPriceTrend
          ? {
              direction: recentPriceTrend.direction,
              strength: Math.round(recentPriceTrend.strength * 100),
              confidence: Math.round(recentPriceTrend.confidence * 100),
            }
          : null,
        competitor_price: competitorTrend
          ? {
              direction: competitorTrend.direction,
              strength: Math.round(competitorTrend.strength * 100),
              confidence: Math.round(competitorTrend.confidence * 100),
            }
          : null,
        booking_pace: bookingTrend
          ? {
              direction: bookingTrend.direction,
              strength: Math.round(bookingTrend.strength * 100),
              confidence: Math.round(bookingTrend.confidence * 100),
            }
          : null,
        revenue: revenueTrend
          ? {
              direction: revenueTrend.direction,
              strength: Math.round(revenueTrend.strength * 100),
              confidence: Math.round(revenueTrend.confidence * 100),
            }
          : null,
      },
      seasonality: seasonality
        ? {
            pattern: seasonality.period === 7 ? "weekly" : seasonality.period === 30 ? "monthly" : "custom",
            period_days: seasonality.period,
            strength: Math.round(seasonality.amplitude * 100),
          }
        : null,
      price_positioning: {
        label: positioningLabel,
        ratio: Math.round(pricePositioning * 100) / 100,
        our_avg: Math.round(avgOurPrice),
        competitor_avg: Math.round(avgCompPrice),
      },
      moving_averages: {
        ema_7: ema7.length > 0 ? Math.round(ema7[ema7.length - 1]) : null,
        ema_30: ema30.length > 0 ? Math.round(ema30[ema30.length - 1]) : null,
        current_price: ourPrices.length > 0 ? ourPrices[ourPrices.length - 1] : null,
      },
      performance_metrics: performanceMetrics,
      insights,
      recommendations,
      data_quality: {
        price_data_points: ourPrices.length,
        competitor_data_points: competitorAvgPrices.length,
        booking_count: bookings?.length || 0,
        revenue_data_points: revenues.length,
      },
    })
  } catch (error) {
    console.error("[Trend Analysis] Error:", error)
    return NextResponse.json({ error: "Failed to analyze trends", details: String(error) }, { status: 500 })
  }
}

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0

  const mean = prices.reduce((a, b) => a + b, 0) / prices.length
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
  const stdDev = Math.sqrt(variance)

  return Math.round((stdDev / mean) * 100) // Coefficient of variation as percentage
}

function generateRecommendations(
  priceTrend: any,
  competitorTrend: any,
  bookingTrend: any,
  positioning: string,
  metrics: any,
): string[] {
  const recommendations: string[] = []

  // Price trend recommendations
  if (priceTrend?.direction === "down" && bookingTrend?.direction === "down") {
    recommendations.push("Critical: Both prices and bookings are declining. Consider marketing initiatives or price stabilization")
  } else if (priceTrend?.direction === "up" && bookingTrend?.direction === "down") {
    recommendations.push("Price increases may be affecting demand. Monitor closely or consider slight reduction")
  }

  // Positioning recommendations
  if (positioning === "premium" && metrics.booking_velocity?.direction === "down") {
    recommendations.push("Premium positioning with declining bookings. Test moderate price reduction (5-10%)")
  } else if (positioning === "discount" && metrics.booking_velocity?.direction === "up") {
    recommendations.push("Strong demand at discount prices. Gradual price increase recommended (3-5%)")
  }

  // Competitor-based recommendations
  if (competitorTrend?.direction === "up" && priceTrend?.direction !== "up") {
    recommendations.push("Market is moving up. Consider raising prices to match market trend")
  } else if (competitorTrend?.direction === "down" && positioning === "premium") {
    recommendations.push("Competitors lowering prices. Review your premium positioning or enhance value proposition")
  }

  // Volatility recommendations
  if (metrics.price_volatility > 20) {
    recommendations.push("High price volatility detected. Consider more stable pricing strategy for better customer trust")
  }

  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push("Performance stable. Continue monitoring trends and adjust as market conditions change")
  }

  return recommendations
}
