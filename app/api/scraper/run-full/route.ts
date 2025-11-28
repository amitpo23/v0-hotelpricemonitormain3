import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const SCAN_DAYS = 180

interface DetectedRoomType {
  name: string
  basePrice: number
  maxOccupancy: number
  amenities: string[]
}

// Simulated room types that would be scraped from booking.com
const COMMON_ROOM_TYPES: DetectedRoomType[] = [
  { name: "Standard Room", basePrice: 100, maxOccupancy: 2, amenities: ["WiFi", "TV", "AC"] },
  { name: "Superior Room", basePrice: 130, maxOccupancy: 2, amenities: ["WiFi", "TV", "AC", "Mini Bar"] },
  { name: "Deluxe Room", basePrice: 170, maxOccupancy: 3, amenities: ["WiFi", "TV", "AC", "Mini Bar", "City View"] },
  { name: "Junior Suite", basePrice: 220, maxOccupancy: 3, amenities: ["WiFi", "TV", "AC", "Mini Bar", "Living Area"] },
  {
    name: "Executive Suite",
    basePrice: 300,
    maxOccupancy: 4,
    amenities: ["WiFi", "TV", "AC", "Mini Bar", "Living Area", "Kitchen"],
  },
  { name: "Family Room", basePrice: 200, maxOccupancy: 5, amenities: ["WiFi", "TV", "AC", "2 Beds"] },
  { name: "Studio", basePrice: 150, maxOccupancy: 2, amenities: ["WiFi", "TV", "AC", "Kitchenette"] },
]

async function detectRoomTypesFromUrl(hotelUrl: string, hotelName: string): Promise<DetectedRoomType[]> {
  // In a real implementation, this would scrape booking.com, expedia, etc.
  // For now, we simulate by selecting random room types based on hotel characteristics

  const numRoomTypes = 3 + Math.floor(Math.random() * 4) // 3-6 room types
  const shuffled = [...COMMON_ROOM_TYPES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, numRoomTypes)
}

async function detectCompetitorRoomTypes(competitorUrl: string, competitorName: string): Promise<DetectedRoomType[]> {
  // Simulated detection - in reality would scrape the actual URL
  const numRoomTypes = 2 + Math.floor(Math.random() * 4) // 2-5 room types
  const shuffled = [...COMMON_ROOM_TYPES].sort(() => Math.random() - 0.5)

  // Adjust prices based on competitor
  return shuffled.slice(0, numRoomTypes).map((rt) => ({
    ...rt,
    basePrice: Math.round(rt.basePrice * (0.85 + Math.random() * 0.3)), // ±15% variance
  }))
}

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

function generateCompetitorPrice(
  basePrice: number,
  date: Date,
  competitor: { id: string; competitor_hotel_name: string; star_rating?: number },
  roomTypeMultiplier = 1.0,
): number {
  const { multiplier } = getDemandLevel(date)
  const starVariance = competitor.star_rating ? 0.85 + (competitor.star_rating - 3) * 0.1 : 0.95
  const randomFactor = 0.92 + Math.random() * 0.16
  return Math.round(basePrice * starVariance * multiplier * randomFactor * roomTypeMultiplier)
}

function calculateRecommendedPrice(
  ourPrice: number,
  competitorPrices: number[],
  demandLevel: string,
): { price: number; recommendation: string; action: string } {
  if (competitorPrices.length === 0) {
    return { price: ourPrice, recommendation: "No competitors to compare", action: "maintain" }
  }

  const avgPrice = Math.round(competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length)
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
    }
  } else if (demandLevel === "high") {
    recommendedPrice = Math.round(avgPrice * 1.05)
    if (ourPrice < avgPrice) {
      recommendation = `High demand. Consider raising to market avg of $${avgPrice}`
      action = "increase"
    } else {
      recommendation = `Well positioned for high demand`
    }
  } else if (demandLevel === "medium") {
    recommendedPrice = avgPrice
    if (ourPrice > avgPrice * 1.15) {
      recommendation = `Price above competitors. Consider reducing to $${avgPrice}`
      action = "decrease"
    } else if (ourPrice < avgPrice * 0.85) {
      recommendation = `Price below market. Opportunity to increase to $${avgPrice}`
      action = "increase"
    } else {
      recommendation = `Price is competitive with market`
    }
  } else {
    recommendedPrice = Math.round(avgPrice * 0.95)
    if (ourPrice > avgPrice) {
      recommendation = `Low demand. Reduce price to $${recommendedPrice} to capture bookings`
      action = "decrease"
    } else {
      recommendation = `Good positioning for low demand period`
    }
  }

  recommendedPrice = Math.max(recommendedPrice, Math.round(ourPrice * 0.7))
  recommendedPrice = Math.min(recommendedPrice, Math.round(ourPrice * 1.5))

  return { price: recommendedPrice, recommendation, action }
}

function generateRoomTypeColor(index: number): string {
  const colors = [
    "#06b6d4", // cyan
    "#8b5cf6", // violet
    "#22c55e", // green
    "#f97316", // orange
    "#ec4899", // pink
    "#eab308", // yellow
    "#3b82f6", // blue
  ]
  return colors[index % colors.length]
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { hotelId, roomTypeId, autoDetectRoomTypes = true } = await request.json()

    const { data: hotel, error: hotelError } = await supabase.from("hotels").select("*").eq("id", hotelId).single()

    if (hotelError || !hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    let { data: hotelRoomTypes } = await supabase
      .from("hotel_room_types")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    if (autoDetectRoomTypes && (!hotelRoomTypes || hotelRoomTypes.length === 0)) {
      // Detect room types from hotel URL
      const detectedRoomTypes = await detectRoomTypesFromUrl(hotel.competitor_urls?.[0] || "", hotel.name)

      // Insert detected room types
      const roomTypesToInsert = detectedRoomTypes.map((rt, index) => ({
        hotel_id: hotelId,
        name: rt.name,
        base_price: rt.basePrice,
        display_color: generateRoomTypeColor(index),
        is_active: true,
      }))

      const { data: insertedRoomTypes, error: insertError } = await supabase
        .from("hotel_room_types")
        .insert(roomTypesToInsert)
        .select()

      if (!insertError && insertedRoomTypes) {
        hotelRoomTypes = insertedRoomTypes
      }
    }

    // Get competitors
    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select(`*, competitor_room_types (*)`)
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    if (!competitors || competitors.length === 0) {
      return NextResponse.json(
        { error: "No competitors configured. Please add competitors first.", redirect: "/competitors/add" },
        { status: 400 },
      )
    }

    for (const comp of competitors) {
      if (!comp.competitor_room_types || comp.competitor_room_types.length === 0) {
        const detectedCompRoomTypes = await detectCompetitorRoomTypes(
          comp.competitor_url || comp.booking_url || "",
          comp.competitor_hotel_name,
        )

        const compRoomTypesToInsert = detectedCompRoomTypes.map((rt, index) => ({
          competitor_id: comp.id,
          name: rt.name,
          display_color: generateRoomTypeColor(index),
          is_active: true,
        }))

        const { data: insertedCompRoomTypes } = await supabase
          .from("competitor_room_types")
          .insert(compRoomTypesToInsert)
          .select()

        if (insertedCompRoomTypes) {
          comp.competitor_room_types = insertedCompRoomTypes
        }
      }
    }

    const basePrice = hotel.base_price || 150
    const results = []
    const competitorPriceResults = []
    const today = new Date()

    const roomTypesToScan = roomTypeId
      ? hotelRoomTypes?.filter((rt) => rt.id === roomTypeId) || []
      : hotelRoomTypes && hotelRoomTypes.length > 0
        ? hotelRoomTypes
        : [{ id: null, name: "Standard Room", base_price: basePrice }]

    for (let i = 0; i < SCAN_DAYS; i++) {
      const scanDate = new Date(today)
      scanDate.setDate(scanDate.getDate() + i)
      const dateStr = scanDate.toISOString().split("T")[0]
      const { level: demandLevel, multiplier } = getDemandLevel(scanDate)

      for (const roomType of roomTypesToScan) {
        const roomBasePrice = roomType.base_price || basePrice
        const ourPrice = Math.round(roomBasePrice * multiplier * (0.95 + Math.random() * 0.1))

        const competitorPrices: number[] = []
        const competitorPriceDetails: {
          competitorId: string
          roomTypeId: string | null
          price: number
          roomTypeName: string
        }[] = []

        for (const comp of competitors) {
          const compRoomTypes = comp.competitor_room_types || []

          let matchingRoomType = compRoomTypes.find(
            (crt: any) =>
              crt.name.toLowerCase() === roomType.name.toLowerCase() ||
              crt.name.toLowerCase().includes(roomType.name.toLowerCase().split(" ")[0]) ||
              roomType.name.toLowerCase().includes(crt.name.toLowerCase().split(" ")[0]),
          )

          // If no exact match, find by category (Standard, Deluxe, Suite, etc.)
          if (!matchingRoomType) {
            const roomCategory = roomType.name.toLowerCase()
            matchingRoomType = compRoomTypes.find((crt: any) => {
              const compCategory = crt.name.toLowerCase()
              if (roomCategory.includes("standard") && compCategory.includes("standard")) return true
              if (roomCategory.includes("superior") && compCategory.includes("superior")) return true
              if (roomCategory.includes("deluxe") && compCategory.includes("deluxe")) return true
              if (roomCategory.includes("suite") && compCategory.includes("suite")) return true
              if (roomCategory.includes("family") && compCategory.includes("family")) return true
              return false
            })
          }

          // Generate price for each competitor room type
          const roomMultiplier = matchingRoomType ? 1.0 : 0.95
          const price = generateCompetitorPrice(roomBasePrice, scanDate, comp, roomMultiplier)
          competitorPrices.push(price)

          competitorPriceDetails.push({
            competitorId: comp.id,
            roomTypeId: matchingRoomType?.id || null,
            price,
            roomTypeName: matchingRoomType?.name || roomType.name,
          })

          // Store competitor price
          competitorPriceResults.push({
            hotel_id: hotelId,
            competitor_id: comp.id,
            room_type_id: matchingRoomType?.id || null,
            date: dateStr,
            price: price,
            source: "auto_scan",
            room_type: matchingRoomType?.name || roomType.name,
            availability: true,
            scraped_at: new Date().toISOString(),
          })
        }

        const recommendation = calculateRecommendedPrice(ourPrice, competitorPrices, demandLevel)

        results.push({
          hotel_id: hotelId,
          room_type_id: roomType.id,
          date: dateStr,
          our_price: ourPrice,
          recommended_price: recommendation.price,
          min_competitor_price: competitorPrices.length > 0 ? Math.min(...competitorPrices) : null,
          max_competitor_price: competitorPrices.length > 0 ? Math.max(...competitorPrices) : null,
          avg_competitor_price:
            competitorPrices.length > 0
              ? Math.round(competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length)
              : null,
          demand_level: demandLevel,
          price_recommendation: recommendation.recommendation,
          autopilot_action: recommendation.action,
          updated_at: new Date().toISOString(),
        })
      }
    }

    // Batch upsert competitor prices
    if (competitorPriceResults.length > 0) {
      // Upsert in batches of 500
      for (let i = 0; i < competitorPriceResults.length; i += 500) {
        const batch = competitorPriceResults.slice(i, i + 500)
        await supabase.from("competitor_daily_prices").upsert(batch, {
          onConflict: "competitor_id,date,room_type_id",
          ignoreDuplicates: false,
        })
      }
    }

    // Upsert daily prices in batches
    for (let i = 0; i < results.length; i += 500) {
      const batch = results.slice(i, i + 500)
      const { error: upsertError } = await supabase.from("daily_prices").upsert(batch, {
        onConflict: "hotel_id,date,room_type_id",
        ignoreDuplicates: false,
      })

      if (upsertError) {
        console.error("Upsert error:", upsertError)
      }
    }

    const roomTypeAverages = roomTypesToScan.map((rt) => {
      const rtPrices = results.filter((r) => r.room_type_id === rt.id)
      const avgOur =
        rtPrices.length > 0
          ? Math.round(rtPrices.reduce((sum, r) => sum + r.our_price, 0) / rtPrices.length)
          : rt.base_price || basePrice
      const avgComp =
        rtPrices.filter((r) => r.avg_competitor_price).length > 0
          ? Math.round(
              rtPrices
                .filter((r) => r.avg_competitor_price)
                .reduce((sum, r) => sum + (r.avg_competitor_price || 0), 0) /
                rtPrices.filter((r) => r.avg_competitor_price).length,
            )
          : avgOur
      return {
        roomType: rt.name,
        roomTypeId: rt.id,
        avgOurPrice: avgOur,
        avgCompetitorPrice: avgComp,
        priceRange: {
          min: Math.min(...rtPrices.map((r) => r.our_price)),
          max: Math.max(...rtPrices.map((r) => r.our_price)),
        },
      }
    })

    return NextResponse.json({
      success: true,
      message: `Scanned ${SCAN_DAYS} days for ${hotel.name}`,
      daysScanned: SCAN_DAYS,
      roomTypesScanned: roomTypesToScan.length,
      roomTypes: roomTypesToScan.map((rt) => ({ id: rt.id, name: rt.name, color: rt.display_color })),
      roomTypeAverages,
      competitors: competitors.map((c) => ({
        name: c.competitor_hotel_name,
        stars: c.star_rating,
        color: c.display_color,
        roomTypes: c.competitor_room_types?.map((crt: any) => crt.name) || [],
      })),
      competitorCount: competitors.length,
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
