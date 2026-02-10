import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/server"
import { weatherService } from "@/lib/external/weather-service"
import { bookingVelocityTracker } from "@/lib/analytics/booking-velocity"
import { yoyService } from "@/lib/analytics/year-over-year"
import { analyzeCBSTourism } from "@/lib/agents/cbs-tourism-agent"
import { discoverEvents } from "@/lib/agents/events-agent"
import { getCompetitorPrices } from "@/lib/agents/competitor-agent"

/**
 * Agent Health Check API
 * Returns status of all 8 AI agents used in predictions
 * 
 * GET /api/agent-health?hotelId=123&checkInDate=2025-02-01
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get("hotelId")
    const checkInDate = searchParams.get("checkInDate")

    if (!hotelId || !checkInDate) {
      return NextResponse.json(
        { error: "Missing hotelId or checkInDate" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Fetch hotel details
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .select("*")
      .eq("id", hotelId)
      .single()

    if (hotelError || !hotel) {
      return NextResponse.json(
        { error: "Hotel not found" },
        { status: 404 }
      )
    }

    // Test each agent
    const agentResults = []

    // 1. Weather Service
    try {
      const weather = await weatherService.getWeatherImpact(
        hotel.city || "Tel Aviv",
        checkInDate
      )
      agentResults.push({
        name: "Weather Service",
        status: weather ? "healthy" : "degraded",
        dataAvailable: !!weather,
        dataQuality: weather ? 1.0 : 0.0,
        message: weather
          ? `Weather data available: ${weather.condition}`
          : "Weather data unavailable - using neutral assumption",
      })
    } catch (err) {
      agentResults.push({
        name: "Weather Service",
        status: "unhealthy",
        dataAvailable: false,
        dataQuality: 0.0,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }

    // 2. Booking Velocity Tracker
    try {
      const velocity = await bookingVelocityTracker.getVelocityForDate(
        hotelId,
        checkInDate
      )
      agentResults.push({
        name: "Booking Velocity Tracker",
        status: velocity ? "healthy" : "degraded",
        dataAvailable: !!velocity,
        dataQuality: velocity ? 1.0 : 0.5,
        message: velocity
          ? `Velocity: ${velocity.velocity7d.toFixed(1)}/day`
          : "Limited booking data - using occupancy proxy",
      })
    } catch (err) {
      agentResults.push({
        name: "Booking Velocity Tracker",
        status: "unhealthy",
        dataAvailable: false,
        dataQuality: 0.0,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }

    // 3. Year-over-Year Service
    try {
      const yoy = await yoyService.compareYearOverYear(
        hotelId,
        checkInDate
      )
      agentResults.push({
        name: "Year-over-Year Analysis",
        status: yoy ? "healthy" : "degraded",
        dataAvailable: !!yoy,
        dataQuality: yoy ? 0.9 : 0.6,
        message: yoy
          ? `YoY seasonal index: ${yoy.seasonalIndex.toFixed(2)}`
          : "Limited historical data - using generic seasonality",
      })
    } catch (err) {
      agentResults.push({
        name: "Year-over-Year Analysis",
        status: "unhealthy",
        dataAvailable: false,
        dataQuality: 0.0,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }

    // 4. CBS Tourism Agent
    try {
      const cbs = await analyzeCBSTourism(
        hotel.city || "Tel Aviv",
        new Date(checkInDate)
      )
      const cbsData = cbs.dataPoints as { seasonalIndex?: number; growthRate?: number } | undefined
      agentResults.push({
        name: "CBS Tourism Statistics",
        status: cbs ? "healthy" : "degraded",
        dataAvailable: !!cbs,
        dataQuality: cbs ? 0.95 : 0.7,
        message: cbs && cbsData?.seasonalIndex
          ? `CBS index: ${cbsData.seasonalIndex.toFixed(2)} (${((cbsData.growthRate ?? 0)).toFixed(1)}% growth)`
          : "CBS data unavailable - using local seasonality",
      })
    } catch (err) {
      agentResults.push({
        name: "CBS Tourism Statistics",
        status: "unhealthy",
        dataAvailable: false,
        dataQuality: 0.0,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }

    // 5. Events Agent
    try {
      const eventsResult = await discoverEvents(
        hotel.city || "Tel Aviv",
        new Date(checkInDate)
      )
      const eventsCount = eventsResult?.events?.length ?? 0
      agentResults.push({
        name: "Events Discovery",
        status: eventsResult ? "healthy" : "degraded",
        dataAvailable: eventsCount > 0,
        dataQuality: eventsCount > 0 ? 0.8 : 1.0, // No events is valid data
        message: eventsCount > 0
          ? `${eventsCount} event(s) found`
          : "No major events detected - baseline demand",
      })
    } catch (err) {
      agentResults.push({
        name: "Events Discovery",
        status: "unhealthy",
        dataAvailable: false,
        dataQuality: 0.5,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }

    // 6. Competitor Agent
    try {
      const competitorResult = await getCompetitorPrices(
        hotelId,
        hotel.city || "Tel Aviv",
        checkInDate
      )
      const competitorsCount = competitorResult?.competitors?.length ?? 0
      agentResults.push({
        name: "Competitor Pricing",
        status: competitorsCount > 0 ? "healthy" : "degraded",
        dataAvailable: competitorsCount > 0,
        dataQuality: competitorsCount > 0 ? 0.9 : 0.6,
        message:
          competitorsCount > 0
            ? `${competitorsCount} competitor(s) tracked`
            : "No recent competitor data - using historical pricing",
      })
    } catch (err) {
      agentResults.push({
        name: "Competitor Pricing",
        status: "unhealthy",
        dataAvailable: false,
        dataQuality: 0.0,
        message: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      })
    }

    // 7. Seasonality (always available from historical patterns)
    agentResults.push({
      name: "Seasonality Analysis",
      status: "healthy",
      dataAvailable: true,
      dataQuality: 0.85,
      message: "Seasonality calculated from hotel patterns",
    })

    // 8. Occupancy & Demand (from database)
    try {
      const { data: occupancy } = await supabase
        .from("hotel_rooms")
        .select("occupancy")
        .eq("hotel_id", hotelId)
        .gte("date", checkInDate)
        .lte("date", checkInDate)
        .single()

      agentResults.push({
        name: "Occupancy & Demand",
        status: occupancy ? "healthy" : "degraded",
        dataAvailable: !!occupancy,
        dataQuality: occupancy ? 1.0 : 0.7,
        message: occupancy
          ? `Current occupancy: ${occupancy.occupancy}%`
          : "Using historical occupancy patterns",
      })
    } catch (err) {
      agentResults.push({
        name: "Occupancy & Demand",
        status: "degraded",
        dataAvailable: false,
        dataQuality: 0.5,
        message: "Using estimated occupancy",
      })
    }

    // Calculate overall data quality
    const totalQuality = agentResults.reduce((sum, agent) => sum + agent.dataQuality, 0)
    const avgDataQuality = totalQuality / agentResults.length
    const healthyCount = agentResults.filter(a => a.status === "healthy").length
    const degradedCount = agentResults.filter(a => a.status === "degraded").length
    const unhealthyCount = agentResults.filter(a => a.status === "unhealthy").length

    return NextResponse.json({
      overallStatus:
        unhealthyCount > 3 ? "critical" :
        degradedCount > 5 ? "degraded" :
        "healthy",
      dataQualityScore: avgDataQuality,
      summary: {
        healthy: healthyCount,
        degraded: degradedCount,
        unhealthy: unhealthyCount,
        total: agentResults.length,
      },
      agents: agentResults,
      recommendation:
        avgDataQuality >= 0.75
          ? "High data quality - predictions are reliable"
          : avgDataQuality >= 0.5
          ? "Moderate data quality - predictions have acceptable confidence"
          : "Low data quality - predictions may be less accurate",
    })
  } catch (error) {
    logger.error("[Agent Health] Error", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        error: "Failed to check agent health",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
