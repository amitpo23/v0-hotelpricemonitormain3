ה import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { scrapeCompetitorPrices } from "@/lib/scraper/real-scraper"

const SCAN_DAYS = 180

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

    const { hotelId, roomTypeId, useRealScraping = true } = requestBody

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId is required" }, { status: 400 })
    }

    // Get hotel
    const { data: hotel, error: hotelError } = await supabase.from("hotels").select("*").eq("id", hotelId).single()

    if (hotelError || !hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    // Create scan record
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

    // Get room types
    let { data: hotelRoomTypes } = await supabase
      .from("hotel_room_types")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("is_active", true)

    if (!hotelRoomTypes || hotelRoomTypes.length === 0) {
      // Create default room types
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

    // Get competitors
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
          error_message: "No competitors configured",
        })
        .eq("id", scanRecord.id)
      return NextResponse.json({ error: "No competitors configured" }, { status: 400 })
    }

    // Get existing prices for comparison
    const { data: existingPrices } = await supabase
      .from("competitor_daily_prices")
      .select("competitor_id, date, price, source, room_type")
      .eq("hotel_id", hotelId)
      .eq("source", "Booking.com")

    const oldPricesMap = new Map<string, number>()
    if (existingPrices) {
      for (const ep of existingPrices) {
        const key = `${ep.competitor_id}-${ep.date}-${ep.room_type}`
        oldPricesMap.set(key, ep.price)
      }
    }

    const basePrice = hotel.base_price || 150
    const results: any[] = []
    const competitorPriceResults: any[] = []
    const priceHistoryRecords: any[] = []
    const today = new Date()

    const roomTypesToScan = roomTypeId
      ? hotelRoomTypes?.filter((rt) => rt.id === roomTypeId) || []
      : hotelRoomTypes?.filter((rt) => rt.id != null) || []

    if (roomTypesToScan.length === 0) {
      await supabase
        .from("scans")
        .update({ status: "failed", completed_at: new Date().toISOString(), error_message: "No room types" })
        .eq("id", scanRecord.id)
      return NextResponse.json({ error: "No room types configured" }, { status: 400 })
    }

    console.log(`[v0] Scanning ${competitors.length} competitors for ${SCAN_DAYS} days on Booking.com`)
    console.log(`[v0] Real scraping enabled: ${useRealScraping}`)
    console.log(`[v0] Bright Data config:`, {
      hasProxyHost: !!process.env.BRIGHT_DATA_PROXY_HOST,
      hasProxyPort: !!process.env.BRIGHT_DATA_PROXY_PORT,
      hasUsername: !!process.env.BRIGHT_DATA_USERNAME,
      hasPassword: !!process.env.BRIGHT_DATA_PASSWORD,
    })

    let successfulScrapes = 0
    let failedScrapes = 0

    for (let i = 0; i < SCAN_DAYS; i++) {
      const scanDate = new Date(today)
      scanDate.setDate(scanDate.getDate() + i)
      const dateStr = scanDate.toISOString().split("T")[0]
      const checkOutDate = new Date(scanDate)
      checkOutDate.setDate(checkOutDate.getDate() + 1)
      const checkOutStr = checkOutDate.toISOString().split("T")[0]

      const { level: demandLevel, multiplier } = getDemandLevel(scanDate)

      for (const roomType of roomTypesToScan) {
        const roomBasePrice = roomType.base_price || basePrice
        const ourPrice = Math.round(roomBasePrice * multiplier * (0.95 + Math.random() * 0.1))
        const competitorPrices: number[] = []

        for (const comp of competitors) {
          if (useRealScraping) {
            try {
              const scrapedResult = await scrapeCompetitorPrices(
                {
                  id: comp.id,
                  competitor_hotel_name: comp.competitor_hotel_name,
                  booking_url: comp.booking_url,
                  city: hotel.city || "Tel Aviv",
                },
                dateStr,
                checkOutStr,
              )

              if (scrapedResult.bookingSuccess && scrapedResult.bookingPrice) {
                const bookingPrice = scrapedResult.bookingPrice

                // Add to competitor prices array for recommendations
                competitorPrices.push(bookingPrice)

                // Add to database records
                competitorPriceResults.push({
                  hotel_id: hotelId,
                  competitor_id: comp.id,
                  date: dateStr,
                  price: bookingPrice,
                  source: "Booking.com",
                  room_type: scrapedResult.roomType || "Standard Room",
                  availability: true,
                  scraped_at: new Date().toISOString(),
                })

                // Track price changes for history
                const key = `${comp.id}-${dateStr}-${scrapedResult.roomType || "Standard Room"}`
                const oldPrice = oldPricesMap.get(key)
                if (oldPrice && oldPrice !== bookingPrice) {
                  priceHistoryRecords.push({
                    hotel_id: hotelId,
                    competitor_id: comp.id,
                    date: dateStr,
                    old_price: oldPrice,
                    new_price: bookingPrice,
                    price_change: bookingPrice - oldPrice,
                    change_percent: ((bookingPrice - oldPrice) / oldPrice) * 100,
                    source: "Booking.com",
                    room_type: scrapedResult.roomType || "Standard Room",
                  })
                }

                successfulScrapes++
              } else {
                failedScrapes++
                console.log(`[v0] No real price for ${comp.competitor_hotel_name} on ${dateStr}`)
              }
            } catch (error) {
              failedScrapes++
              console.error(`[v0] Scrape error for ${comp.competitor_hotel_name}:`, error)
            }
          }

          // Small delay between competitors
          if (i % 5 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }

        if (competitorPrices.length > 0) {
          const recommendation = calculateRecommendedPrice(ourPrice, competitorPrices, demandLevel)

          results.push({
            hotel_id: hotelId,
            room_type_id: roomType.id,
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
          })
        }
      }
    }

    console.log(`[v0] Scraping complete. Real data: ${successfulScrapes}, Failed: ${failedScrapes}`)
    console.log(`[v0] Data to save: ${competitorPriceResults.length} competitor prices, ${priceHistoryRecords.length} history records, ${results.length} daily prices`)

    // Save competitor prices
    if (competitorPriceResults.length > 0) {
      for (let i = 0; i < competitorPriceResults.length; i += 500) {
        const batch = competitorPriceResults.slice(i, i + 500)
        const { error: upsertError } = await supabase.from("competitor_daily_prices").upsert(batch, {
          onConflict: "competitor_id,date,source",
          ignoreDuplicates: false,
        })

        if (upsertError) {
          console.error("[v0] Error upserting competitor prices:", upsertError)
        } else {
          console.log(`[v0] Saved batch ${Math.floor(i / 500) + 1} of competitor prices (${batch.length} records)`)
        }
      }
    } else {
      console.log("[v0] No competitor prices to save")
    }

    // Save price history
    if (priceHistoryRecords.length > 0) {
      for (let i = 0; i < priceHistoryRecords.length; i += 500) {
        const batch = priceHistoryRecords.slice(i, i + 500)
        const { error: historyError } = await supabase.from("competitor_price_history").insert(batch)

        if (historyError) {
          console.error("[v0] Error inserting price history:", historyError)
        } else {
          console.log(`[v0] Saved batch ${Math.floor(i / 500) + 1} of price history (${batch.length} records)`)
        }
      }
    }

    // Save daily prices with recommendations
    const validResults = results.filter((r) => r.room_type_id != null)
    if (validResults.length > 0) {
      for (let i = 0; i < validResults.length; i += 500) {
        const batch = validResults.slice(i, i + 500)
        const { error: dailyError } = await supabase.from("daily_prices").upsert(batch, {
          onConflict: "hotel_id,date,room_type_id",
          ignoreDuplicates: false,
        })

        if (dailyError) {
          console.error("[v0] Error upserting daily prices:", dailyError)
        } else {
          console.log(`[v0] Saved batch ${Math.floor(i / 500) + 1} of daily prices (${batch.length} records)`)
        }
      }
    } else {
      console.log("[v0] No valid daily prices to save (missing room_type_id)")
    }

    await supabase
      .from("scans")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results_count: results.length,
      })
      .eq("id", scanRecord.id)

    const increases = priceHistoryRecords.filter((r) => r.price_change > 0).length
    const decreases = priceHistoryRecords.filter((r) => r.price_change < 0).length

    return NextResponse.json({
      success: true,
      scanId: scanRecord.id,
      message: `Scanned! ${increases} increases, ${decreases} decreases`,
      daysScanned: SCAN_DAYS,
      roomTypesScanned: roomTypesToScan.length,
      sources: DATA_SOURCES,
      competitorCount: competitors.length,
      scrapingStats: {
        successful: successfulScrapes,
        failed: failedScrapes,
        realScrapingEnabled: useRealScraping,
      },
      summary: {
        increaseRecommendations: results.filter((r) => r.autopilot_action === "increase").length,
        decreaseRecommendations: results.filter((r) => r.autopilot_action === "decrease").length,
        maintainRecommendations: results.filter((r) => r.autopilot_action === "maintain").length,
      },
    })
  } catch (error) {
    console.error("[v0] Scraper error:", error)
    return NextResponse.json({ error: "Scraper failed", details: String(error) }, { status: 500 })
  }
}
