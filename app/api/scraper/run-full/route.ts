import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { runPythonScraper, simulateCompetitorPrices } from "@/lib/scraper-wrapper"

const SCAN_DAYS = 180
const USE_REAL_SCRAPER = process.env.USE_REAL_SCRAPER === "true" // Toggle between real and simulated

const DATA_SOURCES = [
  { name: "Booking.com", color: "#003580" },
  { name: "Expedia", color: "#FFCC00" },
]

interface DetectedRoomType {
  name: string
  basePrice: number
  maxOccupancy: number
  amenities: string[]
}

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
]

async function detectRoomTypesFromUrl(hotelUrl: string, hotelName: string): Promise<DetectedRoomType[]> {
  const numRoomTypes = 3 + Math.floor(Math.random() * 3)
  const shuffled = [...COMMON_ROOM_TYPES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, numRoomTypes)
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
): { avgPrice: number; bookingPrice: number; expediaPrice: number } {
  // Use the wrapper function which has the same logic
  return simulateCompetitorPrices(basePrice, date, competitor.star_rating || 3)
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
  const colors = ["#06b6d4", "#8b5cf6", "#22c55e", "#f97316", "#ec4899", "#eab308", "#3b82f6"]
  return colors[index % colors.length]
}

export async function POST(request: Request) {
  const startTime = new Date()

  try {
    const supabase = await createClient()
    const { hotelId, roomTypeId, autoDetectRoomTypes = true } = await request.json()

    const { data: hotel, error: hotelError } = await supabase.from("hotels").select("*").eq("id", hotelId).single()

    if (hotelError || !hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    const { data: scanRecord, error: scanError } = await supabase
      .from("scans")
      .insert({
        scan_config_id: null,
        status: "running",
        started_at: startTime.toISOString(),
        scan_type: "full_calendar",
        hotel_id: hotelId,
        sources: DATA_SOURCES.map((s) => s.name),
      })
      .select()
      .single()

    let { data: hotelRoomTypes } = await supabase
      .from("hotel_room_types")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    if (autoDetectRoomTypes && (!hotelRoomTypes || hotelRoomTypes.length === 0)) {
      const detectedRoomTypes = await detectRoomTypesFromUrl(hotel.competitor_urls?.[0] || "", hotel.name)
      const roomTypesToInsert = detectedRoomTypes.map((rt, index) => ({
        hotel_id: hotelId,
        name: rt.name,
        base_price: rt.basePrice,
        display_color: generateRoomTypeColor(index),
        is_active: true,
      }))

      const { data: insertedRoomTypes } = await supabase.from("hotel_room_types").insert(roomTypesToInsert).select()

      if (insertedRoomTypes) {
        hotelRoomTypes = insertedRoomTypes
      }
    }

    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select(`*, competitor_room_types (*)`)
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    if (!competitors || competitors.length === 0) {
      if (scanRecord) {
        await supabase
          .from("scans")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: "No competitors configured",
          })
          .eq("id", scanRecord.id)
      }
      return NextResponse.json(
        { error: "No competitors configured. Please add competitors first.", redirect: "/competitors/add" },
        { status: 400 },
      )
    }

    const { data: existingPrices } = await supabase
      .from("competitor_daily_prices")
      .select("competitor_id, date, price, source, room_type")
      .eq("hotel_id", hotelId)

    // Create a map for quick lookup of old prices
    const oldPricesMap = new Map<string, number>()
    if (existingPrices) {
      for (const ep of existingPrices) {
        const key = `${ep.competitor_id}-${ep.date}-${ep.source}-${ep.room_type}`
        oldPricesMap.set(key, ep.price)
      }
    }

    const basePrice = hotel.base_price || 150
    const results = []
    const competitorPriceResults: any[] = []
    const priceHistoryRecords: any[] = []
    const scanResults = []
    const today = new Date()

    const roomTypesToScan = roomTypeId
      ? hotelRoomTypes?.filter((rt) => rt.id === roomTypeId) || []
      : hotelRoomTypes && hotelRoomTypes.length > 0
        ? hotelRoomTypes
        : [{ id: null, name: "Standard Room", base_price: basePrice }]

    // Try to scrape real competitor prices if enabled
    let realScrapedPrices: Map<string, number> = new Map()

    if (USE_REAL_SCRAPER && competitors && competitors.length > 0) {
      console.log("[v0] Using REAL scraper for competitor data")

      for (const comp of competitors) {
        // Check if competitor has a Booking.com URL
        const bookingUrl = comp.booking_url || hotel.competitor_urls?.[0]

        if (bookingUrl && bookingUrl.includes("booking.com")) {
          try {
            console.log(`[v0] Scraping ${comp.competitor_hotel_name} from ${bookingUrl}`)
            const scraperResult = await runPythonScraper(bookingUrl, SCAN_DAYS, ["room_only", "with_breakfast"])

            if (scraperResult.success && scraperResult.results) {
              for (const result of scraperResult.results) {
                if (result.price && result.available) {
                  const key = `${comp.id}-${result.date}-Booking.com-${result.room_type}`
                  realScrapedPrices.set(key, result.price)
                }
              }
              console.log(`[v0] Successfully scraped ${scraperResult.results.length} prices for ${comp.competitor_hotel_name}`)
            } else {
              console.error(`[v0] Scraper failed for ${comp.competitor_hotel_name}: ${scraperResult.error}`)
            }
          } catch (error) {
            console.error(`[v0] Error running scraper for ${comp.competitor_hotel_name}:`, error)
          }
        }
      }

      console.log(`[v0] Real scraper collected ${realScrapedPrices.size} prices`)
    } else {
      console.log("[v0] Using SIMULATED competitor prices")
    }

    for (let i = 0; i < SCAN_DAYS; i++) {
      const scanDate = new Date(today)
      scanDate.setDate(scanDate.getDate() + i)
      const dateStr = scanDate.toISOString().split("T")[0]
      const { level: demandLevel, multiplier } = getDemandLevel(scanDate)

      for (const roomType of roomTypesToScan) {
        const roomBasePrice = roomType.base_price || basePrice
        const ourPrice = Math.round(roomBasePrice * multiplier * (0.95 + Math.random() * 0.1))

        const competitorPrices: number[] = []

        for (const comp of competitors) {
          // Check if we have real scraped prices for this competitor
          const bookingKey = `${comp.id}-${dateStr}-Booking.com-room_only`
          const realBookingPrice = realScrapedPrices.get(bookingKey)

          // Use real prices if available, otherwise simulate
          const prices = realBookingPrice
            ? { bookingPrice: realBookingPrice, expediaPrice: Math.round(realBookingPrice * 1.04), avgPrice: Math.round(realBookingPrice * 1.02) }
            : generateCompetitorPrice(roomBasePrice, scanDate, comp)

          competitorPrices.push(prices.avgPrice)

          // Booking.com price
          const bookingKeyWithRoom = `${comp.id}-${dateStr}-Booking.com-${roomType.name}`
          const oldBookingPrice = oldPricesMap.get(bookingKeyWithRoom)

          competitorPriceResults.push({
            hotel_id: hotelId,
            competitor_id: comp.id,
            date: dateStr,
            price: prices.bookingPrice,
            source: "Booking.com",
            room_type: roomType.name,
            availability: true,
            scraped_at: new Date().toISOString(),
            is_real_scraped: !!realBookingPrice, // Mark if this is real data
          })

          if (oldBookingPrice && oldBookingPrice !== prices.bookingPrice) {
            priceHistoryRecords.push({
              hotel_id: hotelId,
              competitor_id: comp.id,
              date: dateStr,
              old_price: oldBookingPrice,
              new_price: prices.bookingPrice,
              price_change: prices.bookingPrice - oldBookingPrice,
              change_percent: Math.round(((prices.bookingPrice - oldBookingPrice) / oldBookingPrice) * 100 * 100) / 100,
              source: "Booking.com",
              room_type: roomType.name,
            })
          }

          // Expedia price (always simulated for now)
          const expediaKey = `${comp.id}-${dateStr}-Expedia-${roomType.name}`
          const oldExpediaPrice = oldPricesMap.get(expediaKey)

          competitorPriceResults.push({
            hotel_id: hotelId,
            competitor_id: comp.id,
            date: dateStr,
            price: prices.expediaPrice,
            source: "Expedia",
            room_type: roomType.name,
            availability: true,
            scraped_at: new Date().toISOString(),
            is_real_scraped: false, // Expedia is always simulated
          })

          if (oldExpediaPrice && oldExpediaPrice !== prices.expediaPrice) {
            priceHistoryRecords.push({
              hotel_id: hotelId,
              competitor_id: comp.id,
              date: dateStr,
              old_price: oldExpediaPrice,
              new_price: prices.expediaPrice,
              price_change: prices.expediaPrice - oldExpediaPrice,
              change_percent: Math.round(((prices.expediaPrice - oldExpediaPrice) / oldExpediaPrice) * 100 * 100) / 100,
              source: "Expedia",
              room_type: roomType.name,
            })
          }

          if (scanRecord && i < 7) {
            scanResults.push({
              scan_id: scanRecord.id,
              hotel_id: hotelId,
              source: "Booking.com",
              price: prices.bookingPrice,
              room_type: roomType.name,
              availability: Math.random() > 0.1,
              scraped_at: new Date().toISOString(),
              metadata: {
                check_in: dateStr,
                competitor_id: comp.id,
                competitor_name: comp.competitor_hotel_name,
              },
            })
            scanResults.push({
              scan_id: scanRecord.id,
              hotel_id: hotelId,
              source: "Expedia",
              price: prices.expediaPrice,
              room_type: roomType.name,
              availability: Math.random() > 0.1,
              scraped_at: new Date().toISOString(),
              metadata: {
                check_in: dateStr,
                competitor_id: comp.id,
                competitor_name: comp.competitor_hotel_name,
              },
            })
          }
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

    // Upsert competitor prices instead of deleting them
    let insertedCount = 0
    if (competitorPriceResults.length > 0) {
      for (let i = 0; i < competitorPriceResults.length; i += 500) {
        const batch = competitorPriceResults.slice(i, i + 500)
        const { data: insertedData, error: insertError } = await supabase
          .from("competitor_daily_prices")
          .upsert(batch, {
            // Match the existing unique constraint: competitor_daily_prices_competitor_id_date_source_key
            onConflict: "competitor_id,date,source",
            ignoreDuplicates: false,
          })
          .select("id")

        if (insertError) {
          console.error(`[v0] Error upserting competitor prices batch ${i}:`, JSON.stringify(insertError))
          // Try inserting one by one to find the problematic record
          for (const record of batch) {
            const { error: singleError } = await supabase.from("competitor_daily_prices").upsert(record, {
              onConflict: "competitor_id,date,source",
              ignoreDuplicates: false,
            })
            if (singleError) {
              console.error(`[v0] Failed record:`, JSON.stringify(record), JSON.stringify(singleError))
            } else {
              insertedCount++
            }
          }
        } else {
          insertedCount += batch.length
        }
      }
    }

    if (priceHistoryRecords.length > 0) {
      for (let i = 0; i < priceHistoryRecords.length; i += 500) {
        const batch = priceHistoryRecords.slice(i, i + 500)
        await supabase.from("competitor_price_history").insert(batch)
      }
    }

    // Upsert daily prices
    for (let i = 0; i < results.length; i += 500) {
      const batch = results.slice(i, i + 500)
      const { error: dpError } = await supabase.from("daily_prices").upsert(batch, {
        onConflict: "hotel_id,date",
        ignoreDuplicates: false,
      })
      if (dpError) {
        console.error(`[v0] Error upserting daily_prices batch ${i}:`, JSON.stringify(dpError))
      }
    }

    // Insert scan results
    if (scanResults.length > 0) {
      await supabase.from("scan_results").insert(scanResults)
    }

    if (scanRecord) {
      await supabase
        .from("scans")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          results_count: results.length,
        })
        .eq("id", scanRecord.id)
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
      }
    })

    return NextResponse.json({
      success: true,
      scanId: scanRecord?.id,
      message: `Scanned ${SCAN_DAYS} days for ${hotel.name}`,
      daysScanned: SCAN_DAYS,
      roomTypesScanned: roomTypesToScan.length,
      sources: DATA_SOURCES,
      roomTypes: roomTypesToScan.map((rt) => ({ id: rt.id, name: rt.name, color: rt.display_color })),
      roomTypeAverages,
      competitors: competitors.map((c) => ({
        id: c.id,
        name: c.competitor_hotel_name,
        stars: c.star_rating,
        color: c.display_color,
      })),
      competitorCount: competitors.length,
      competitorPricesInserted: insertedCount,
      priceChangesRecorded: priceHistoryRecords.length,
      summary: {
        increaseRecommendations: results.filter((r) => r.autopilot_action === "increase").length,
        decreaseRecommendations: results.filter((r) => r.autopilot_action === "decrease").length,
        maintainRecommendations: results.filter((r) => r.autopilot_action === "maintain").length,
      },
    })
  } catch (error) {
    console.error("Scraper error:", error)
    return NextResponse.json({ error: "Scraper failed", details: String(error) }, { status: 500 })
  }
}
