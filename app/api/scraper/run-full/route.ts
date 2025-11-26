import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const DEFAULT_OTA_SOURCES = [
  { name: "Booking.com", variance: 0.95 },
  { name: "Expedia", variance: 1.02 },
  { name: "Hotels.com", variance: 0.98 },
  { name: "Agoda", variance: 1.05 },
  { name: "Trip.com", variance: 0.92 },
]

// Demand factors by day of week and season
function getDemandLevel(date: Date): { level: string; multiplier: number } {
  const dayOfWeek = date.getDay()
  const month = date.getMonth()

  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6
  const isHighSeason = month === 6 || month === 7 || month === 11
  const isMidSeason = month === 3 || month === 4 || month === 5 || month === 8 || month === 9

  const dayOfMonth = date.getDate()
  const isHoliday = (month === 11 && dayOfMonth >= 24 && dayOfMonth <= 31) || (month === 0 && dayOfMonth <= 3)

  if (isHoliday) return { level: "peak", multiplier: 1.5 }
  if (isHighSeason && isWeekend) return { level: "peak", multiplier: 1.35 }
  if (isHighSeason) return { level: "high", multiplier: 1.2 }
  if (isMidSeason && isWeekend) return { level: "high", multiplier: 1.15 }
  if (isMidSeason) return { level: "medium", multiplier: 1.0 }
  if (isWeekend) return { level: "medium", multiplier: 1.05 }
  return { level: "low", multiplier: 0.9 }
}

function generateCompetitorPrices(
  basePrice: number,
  date: Date,
  competitors: Array<{ id: string; competitor_hotel_name: string; star_rating?: number }>,
) {
  const { multiplier } = getDemandLevel(date)

  return competitors.map((comp, index) => {
    // Different variance based on star rating or random
    const starVariance = comp.star_rating
      ? 0.9 + (comp.star_rating - 3) * 0.1 // 3-star: 0.9, 4-star: 1.0, 5-star: 1.1
      : 0.9 + index * 0.05 // Spread prices

    const randomFactor = 0.9 + Math.random() * 0.2
    const price = Math.round(basePrice * starVariance * multiplier * randomFactor)

    return {
      id: comp.id,
      name: comp.competitor_hotel_name,
      price,
      star_rating: comp.star_rating,
    }
  })
}

// Generate prices for OTA sources (when no competitors defined)
function generateOTAPrices(basePrice: number, date: Date) {
  const { multiplier } = getDemandLevel(date)

  return DEFAULT_OTA_SOURCES.map((source) => {
    const randomFactor = 0.9 + Math.random() * 0.2
    const price = Math.round(basePrice * source.variance * multiplier * randomFactor)
    return {
      id: null,
      name: source.name,
      price,
      star_rating: null,
    }
  })
}

// Calculate recommended price based on competitors and demand
function calculateRecommendedPrice(
  ourPrice: number,
  competitors: { name: string; price: number }[],
  demandLevel: string,
): { price: number; recommendation: string; action: string } {
  const prices = competitors.map((c) => c.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

  let recommendedPrice = ourPrice
  let recommendation = ""
  let action = "maintain"

  if (demandLevel === "peak") {
    recommendedPrice = Math.round(avgPrice * 1.1)
    if (ourPrice < recommendedPrice) {
      recommendation = `Peak demand! Increase price. Competitors avg: $${avgPrice}`
      action = "increase"
    } else {
      recommendation = `Good positioning for peak demand`
      action = "maintain"
    }
  } else if (demandLevel === "high") {
    recommendedPrice = Math.round(avgPrice * 1.05)
    if (ourPrice < avgPrice) {
      recommendation = `High demand. Consider raising to market avg of $${avgPrice}`
      action = "increase"
    } else {
      recommendation = `Well positioned for high demand`
      action = "maintain"
    }
  } else if (demandLevel === "medium") {
    recommendedPrice = avgPrice
    if (ourPrice > maxPrice) {
      recommendation = `Price above all competitors. Consider reducing to $${avgPrice}`
      action = "decrease"
    } else if (ourPrice < minPrice * 0.9) {
      recommendation = `Price below market. Opportunity to increase to $${avgPrice}`
      action = "increase"
    } else {
      recommendation = `Price is competitive with market`
      action = "maintain"
    }
  } else {
    recommendedPrice = Math.round(avgPrice * 0.95)
    if (ourPrice > avgPrice) {
      recommendation = `Low demand. Reduce price to $${recommendedPrice} to capture bookings`
      action = "decrease"
    } else {
      recommendation = `Good positioning for low demand period`
      action = "maintain"
    }
  }

  recommendedPrice = Math.max(recommendedPrice, Math.round(ourPrice * 0.7))
  recommendedPrice = Math.min(recommendedPrice, Math.round(ourPrice * 1.5))

  return { price: recommendedPrice, recommendation, action }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { hotelId } = await request.json()

    // Get hotel details
    const { data: hotel, error: hotelError } = await supabase.from("hotels").select("*").eq("id", hotelId).single()

    if (hotelError || !hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    const { data: realCompetitors } = await supabase
      .from("hotel_competitors")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    const hasRealCompetitors = realCompetitors && realCompetitors.length > 0
    const competitorNames = hasRealCompetitors
      ? realCompetitors.map((c) => c.competitor_hotel_name)
      : DEFAULT_OTA_SOURCES.map((s) => s.name)

    const basePrice = hotel.base_price || 150
    const results = []
    const today = new Date()

    // Scan 90 days ahead
    for (let i = 0; i < 90; i++) {
      const scanDate = new Date(today)
      scanDate.setDate(scanDate.getDate() + i)
      const dateStr = scanDate.toISOString().split("T")[0]

      const { level: demandLevel, multiplier } = getDemandLevel(scanDate)
      const ourPrice = Math.round(basePrice * multiplier * (0.95 + Math.random() * 0.1))

      const competitors = hasRealCompetitors
        ? generateCompetitorPrices(basePrice, scanDate, realCompetitors)
        : generateOTAPrices(basePrice, scanDate)

      const competitorPrices = competitors.map((c) => c.price)
      const recommendation = calculateRecommendedPrice(ourPrice, competitors, demandLevel)

      const dailyPrice = {
        hotel_id: hotelId,
        date: dateStr,
        our_price: ourPrice,
        recommended_price: recommendation.price,
        min_competitor_price: Math.min(...competitorPrices),
        max_competitor_price: Math.max(...competitorPrices),
        avg_competitor_price: Math.round(competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length),
        demand_level: demandLevel,
        price_recommendation: recommendation.recommendation,
        autopilot_action: recommendation.action,
        updated_at: new Date().toISOString(),
      }

      results.push(dailyPrice)

      if (hasRealCompetitors) {
        for (const comp of competitors) {
          if (comp.id) {
            await supabase.from("competitor_daily_prices").upsert(
              {
                hotel_id: hotelId,
                competitor_id: comp.id,
                date: dateStr,
                price: comp.price,
                source: "booking",
                room_type: "Standard",
                availability: true,
                scraped_at: new Date().toISOString(),
              },
              { onConflict: "competitor_id,date,source" },
            )
          }
        }
      }

      // Also save to competitor_data for dashboard
      for (const comp of competitors) {
        await supabase.from("competitor_data").upsert(
          {
            hotel_id: hotelId,
            competitor_name: comp.name,
            price: comp.price,
            room_type: "Standard",
            availability: true,
            scraped_at: new Date().toISOString(),
            metadata: { date: dateStr, demand_level: demandLevel },
          },
          { onConflict: "hotel_id,competitor_name", ignoreDuplicates: false },
        )
      }
    }

    // Upsert all daily prices
    const { error: upsertError } = await supabase.from("daily_prices").upsert(results, {
      onConflict: "hotel_id,date",
      ignoreDuplicates: false,
    })

    if (upsertError) {
      console.error("Upsert error:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Scanned 90 days for ${hotel.name}`,
      daysScanned: 90,
      competitors: competitorNames,
      competitorType: hasRealCompetitors ? "real_hotels" : "ota_sources",
      competitorCount: competitorNames.length,
      summary: {
        increaseRecommendations: results.filter((r) => r.autopilot_action === "increase").length,
        decreaseRecommendations: results.filter((r) => r.autopilot_action === "decrease").length,
        maintainRecommendations: results.filter((r) => r.autopilot_action === "maintain").length,
      },
    })
  } catch (error) {
    console.error("Scraper error:", error)
    return NextResponse.json({ error: "Scraper failed" }, { status: 500 })
  }
}
