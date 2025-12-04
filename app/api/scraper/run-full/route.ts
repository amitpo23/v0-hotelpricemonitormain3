import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { scrapeCompetitorPrices } from "@/lib/scraper/real-scraper"

const SCAN_DAYS = 30
const TIMEOUT_MS = 50000 // 50 seconds timeout to avoid Vercel function timeout

const DATA_SOURCES = [{ name: "Booking.com", color: "#003580" }]

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
      recommendation = `Peak demand! Increase price. Competitors avg: ₪${avgPrice}`
      action = "increase"
    } else {
      recommendation = `Good positioning for peak demand`
    }
  } else if (demandLevel === "high") {
    recommendedPrice = Math.round(avgPrice * 1.05)
    if (ourPrice < avgPrice) {
      recommendation = `High demand. Consider raising to market avg of ₪${avgPrice}`
      action = "increase"
    } else {
      recommendation = `Well positioned for high demand`
    }
  } else if (demandLevel === "medium") {
    recommendedPrice = avgPrice
    if (ourPrice > avgPrice * 1.15) {
      recommendation = `Price above competitors. Consider reducing to ₪${avgPrice}`
      action = "decrease"
    } else if (ourPrice < avgPrice * 0.85) {
      recommendation = `Price below market. Opportunity to increase to ₪${avgPrice}`
      action = "increase"
    } else {
      recommendation = `Price is competitive with market`
    }
  } else {
    recommendedPrice = Math.round(avgPrice * 0.95)
    if (ourPrice > avgPrice) {
      recommendation = `Low demand. Reduce price to ₪${recommendedPrice} to capture bookings`
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
  console.log("[v0] Booking.com Scraper started at:", startTime.toISOString())

  try {
    const supabase = await createClient()

    let requestBody
    try {
      requestBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { hotelId, roomTypeId, useRealScraping = true, daysToScan, startDayOffset = 0 } = requestBody

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId is required" }, { status: 400 })
    }

    const scanDays = daysToScan && daysToScan > 0 && daysToScan <= 180 ? daysToScan : SCAN_DAYS
    const dayOffset = startDayOffset >= 0 ? startDayOffset : 0

    const { data: hotel, error: hotelError } = await supabase.from("hotels").select("*").eq("id", hotelId).single()

    if (hotelError || !hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    const { data: scanRecord, error: scanError } = await supabase
      .from("scans")
      .insert({
        config_id: null,
        status: "running",
        started_at: startTime.toISOString(),
      })
      .select()
      .single()

    if (scanError || !scanRecord) {
      return NextResponse.json({ error: "Failed to create scan record" }, { status: 500 })
    }

    let { data: hotelRoomTypes } = await supabase
      .from("hotel_room_types")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    if (!hotelRoomTypes || hotelRoomTypes.length === 0) {
      const defaultRoomTypes = [
        {
          hotel_id: hotelId,
          name: "Standard Room",
          base_price: hotel.base_price || 150,
          display_color: generateRoomTypeColor(0),
          is_active: true,
        },
        {
          hotel_id: hotelId,
          name: "Superior Room",
          base_price: (hotel.base_price || 150) * 1.3,
          display_color: generateRoomTypeColor(1),
          is_active: true,
        },
        {
          hotel_id: hotelId,
          name: "Deluxe Room",
          base_price: (hotel.base_price || 150) * 1.7,
          display_color: generateRoomTypeColor(2),
          is_active: true,
        },
      ]

      const { data: insertedRoomTypes } = await supabase.from("hotel_room_types").insert(defaultRoomTypes).select()
      hotelRoomTypes = insertedRoomTypes || []
    }

    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    if (!competitors || competitors.length === 0) {
      await supabase
        .from("scans")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: "No active competitors configured",
        })
        .eq("id", scanRecord.id)
      return NextResponse.json({ error: "No active competitors found" }, { status: 400 })
    }

    console.log(`[v0] Scanning ${competitors.length} competitors for ${scanDays} days on Booking.com`)
    console.log(`[v0] Date range: Day ${dayOffset} to Day ${dayOffset + scanDays - 1}`)
    console.log(`[v0] Real scraping enabled: ${useRealScraping}`)
    console.log(`[v0] Bright Data config:`, {
      hasProxyHost: !!process.env.BRIGHT_DATA_PROXY_HOST,
      hasProxyPort: !!process.env.BRIGHT_DATA_PROXY_PORT,
      hasUsername: !!process.env.BRIGHT_DATA_USERNAME,
      hasPassword: !!process.env.BRIGHT_DATA_PASSWORD,
    })

    const today = new Date()
    const results: Array<{
      date: string
      day_of_week: number
      demand_level: string
      our_price: number
      competitor_avg: number | null
      price_difference: number | null
      recommendation: string
      recommended_price: number | null
      autopilot_action: string
      data_sources: string[]
      room_type_id: string
    }> = []

    const competitorPriceResults: Array<{
      hotel_id: string
      competitor_id: string
      date: string
      price: number
      source: string
      room_type: string
    }> = []

    const priceHistoryRecords: Array<{
      competitor_id: string
      date: string
      old_price: number | null
      new_price: number
      price_change: number
      change_percent: number
      source: string
    }> = []

    let successfulScrapes = 0
    let failedScrapes = 0
    let timedOut = false

    for (let i = 0; i < scanDays && !timedOut; i++) {
      if (Date.now() - startTime.getTime() > TIMEOUT_MS) {
        console.log(`[v0] Timeout reached after ${i} days. Saving partial results...`)
        timedOut = true
        break
      }

      if (i > 0 && i % 5 === 0) {
        console.log(
          `[v0] Progress: ${i}/${scanDays} days scanned. Success: ${successfulScrapes}, Failed: ${failedScrapes}`,
        )
      }

      const scanDate = new Date(today)
      scanDate.setDate(scanDate.getDate() + dayOffset + i)
      const dateStr = scanDate.toISOString().split("T")[0]
      const dayOfWeek = scanDate.getDay()

      const { level: demandLevel, multiplier } = getDemandLevel(scanDate)
      const competitorPrices: number[] = []

      for (const competitor of competitors) {
        if (useRealScraping) {
          try {
            const scrapedResult = await scrapeCompetitorPrices({
              competitor_hotel_name: competitor.competitor_hotel_name || competitor.name,
              booking_url: competitor.booking_url,
              city: hotel.city || "Tel Aviv",
              checkIn: dateStr,
              checkOut: new Date(scanDate.getTime() + 86400000).toISOString().split("T")[0],
            })

            if (scrapedResult.bookingSuccess && scrapedResult.bookingPrice) {
              successfulScrapes++
              competitorPrices.push(scrapedResult.bookingPrice)

              competitorPriceResults.push({
                hotel_id: hotelId,
                competitor_id: competitor.id,
                date: dateStr,
                price: scrapedResult.bookingPrice,
                source: "Booking.com",
                room_type: scrapedResult.roomType || "Standard Room",
              })

              const { data: existingPrice } = await supabase
                .from("competitor_daily_prices")
                .select("price")
                .eq("competitor_id", competitor.id)
                .eq("date", dateStr)
                .eq("source", "Booking.com")
                .single()

              if (existingPrice && existingPrice.price !== scrapedResult.bookingPrice) {
                const priceChange = scrapedResult.bookingPrice - existingPrice.price
                const changePercent = (priceChange / existingPrice.price) * 100

                priceHistoryRecords.push({
                  competitor_id: competitor.id,
                  date: dateStr,
                  old_price: existingPrice.price,
                  new_price: scrapedResult.bookingPrice,
                  price_change: priceChange,
                  change_percent: changePercent,
                  source: "Booking.com",
                })
              }
            } else {
              failedScrapes++
              console.log(`[v0] Failed to scrape ${competitor.competitor_hotel_name} for ${dateStr}`)
            }
          } catch (error) {
            failedScrapes++
            console.error(`[v0] Scrape error for ${competitor.competitor_hotel_name}:`, error)
          }

          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      for (const roomType of hotelRoomTypes || []) {
        if (roomTypeId && roomType.id !== roomTypeId) continue

        const ourPrice = Math.round(roomType.base_price * multiplier)
        const {
          price: recommendedPrice,
          recommendation,
          action,
        } = calculateRecommendedPrice(ourPrice, competitorPrices, demandLevel)

        results.push({
          date: dateStr,
          day_of_week: dayOfWeek,
          demand_level: demandLevel,
          our_price: ourPrice,
          competitor_avg:
            competitorPrices.length > 0
              ? Math.round(competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length)
              : null,
          price_difference:
            competitorPrices.length > 0
              ? ourPrice - Math.round(competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length)
              : null,
          recommendation,
          recommended_price: recommendedPrice,
          autopilot_action: action,
          data_sources: competitorPrices.length > 0 ? ["Booking.com"] : [],
          room_type_id: roomType.id,
        })
      }
    }

    console.log(
      `[v0] Scraping complete. Real data: ${successfulScrapes}, Failed: ${failedScrapes}${timedOut ? " (TIMED OUT)" : ""}`,
    )
    console.log(
      `[v0] Data to save: ${competitorPriceResults.length} competitor prices, ${priceHistoryRecords.length} history records, ${results.length} daily prices`,
    )

    if (competitorPriceResults.length > 0) {
      const batchSize = 100
      for (let i = 0; i < competitorPriceResults.length; i += batchSize) {
        const batch = competitorPriceResults.slice(i, i + batchSize)
        const { error: competitorError } = await supabase.from("competitor_daily_prices").upsert(
          batch.map((r) => ({
            ...r,
            scraped_at: new Date().toISOString(),
          })),
          { onConflict: "competitor_id,date,source" },
        )

        if (competitorError) {
          console.error(`[v0] Error saving competitor prices batch ${Math.floor(i / batchSize) + 1}:`, competitorError)
        } else {
          console.log(
            `[v0] Saved batch ${Math.floor(i / batchSize) + 1} of competitor prices (${batch.length} records)`,
          )
        }
      }
    }

    if (priceHistoryRecords.length > 0) {
      const { error: historyError } = await supabase.from("competitor_price_history").insert(priceHistoryRecords)
      if (historyError) {
        console.error("[v0] Error saving price history:", historyError)
      }
    }

    if (results.length > 0) {
      const dailyPricesData = results.map((r) => ({
        hotel_id: hotelId,
        room_type_id: r.room_type_id,
        date: r.date,
        base_price: r.our_price,
        recommended_price: r.recommended_price,
        demand_level: r.demand_level,
        competitor_avg_price: r.competitor_avg,
        data_sources: r.data_sources,
      }))

      const { error: pricesError } = await supabase
        .from("daily_prices")
        .upsert(dailyPricesData, { onConflict: "hotel_id,date,room_type_id" })

      if (pricesError) {
        console.error("[v0] Error saving daily prices:", pricesError)
      }
    }

    const increases = results.filter((r) => r.autopilot_action === "increase").length
    const decreases = results.filter((r) => r.autopilot_action === "decrease").length

    await supabase
      .from("scans")
      .update({
        status: timedOut ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        results_count: results.length,
        error_message: timedOut ? `Timed out after scanning ${results.length} results` : null,
      })
      .eq("id", scanRecord.id)

    return NextResponse.json({
      success: true,
      scanId: scanRecord.id,
      message: `Scanned! ${increases} increases, ${decreases} decreases`,
      daysScanned: scanDays,
      timedOut,
      dateRange: {
        startDay: dayOffset,
        endDay: dayOffset + scanDays - 1,
        totalDays: scanDays,
      },
      stats: {
        realScrapes: successfulScrapes,
        failedScrapes: failedScrapes,
        competitorPricesSaved: competitorPriceResults.length,
        priceHistoryRecords: priceHistoryRecords.length,
        dailyPricesSaved: results.length,
        increaseRecommendations: increases,
        decreaseRecommendations: decreases,
        maintainRecommendations: results.filter((r) => r.autopilot_action === "maintain").length,
      },
    })
  } catch (error) {
    console.error("[v0] Scraper error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
