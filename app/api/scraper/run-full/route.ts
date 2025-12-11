import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { scrapeCompetitorAllRooms } from "@/lib/scraper/real-scraper"

const SCAN_DAYS = 30
const TIMEOUT_MS = 50000 // 50 seconds timeout to avoid Vercel function timeout
const maxExecutionTime = TIMEOUT_MS

function getDemandLevel(date: Date): { level: string; multiplier: number } {
  const dayOfWeek = date.getDay()
  const month = date.getMonth()
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6
  const isHighSeason = month === 6 || month === 7 || month === 11

  if (isHighSeason && isWeekend) return { level: "peak", multiplier: 1.35 }
  if (isHighSeason) return { level: "high", multiplier: 1.2 }
  if (isWeekend) return { level: "medium", multiplier: 1.05 }
  return { level: "low", multiplier: 0.9 }
}

function calculateRecommendedPrice(ourPrice: number, competitorPrices: number[], demandLevel: string) {
  if (competitorPrices.length === 0) {
    return { price: ourPrice, recommendation: "No competitors to compare", action: "maintain" }
  }

  const avgPrice = Math.round(competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length)
  let recommendedPrice = ourPrice
  let recommendation = ""
  let action = "maintain"

  if (demandLevel === "peak" && ourPrice < avgPrice) {
    recommendedPrice = Math.round(avgPrice * 1.1)
    recommendation = `Peak demand! Increase to ₪${recommendedPrice}`
    action = "increase"
  } else if (ourPrice > avgPrice * 1.15) {
    recommendedPrice = avgPrice
    recommendation = `Price above market. Consider reducing to ₪${avgPrice}`
    action = "decrease"
  } else if (ourPrice < avgPrice * 0.85) {
    recommendedPrice = avgPrice
    recommendation = `Price below market. Opportunity to increase`
    action = "increase"
  } else {
    recommendation = `Price is competitive`
  }

  return { price: recommendedPrice, recommendation, action }
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
          display_color: "#06b6d4",
          is_active: true,
        },
        {
          hotel_id: hotelId,
          name: "Superior Room",
          base_price: (hotel.base_price || 150) * 1.3,
          display_color: "#8b5cf6",
          is_active: true,
        },
        {
          hotel_id: hotelId,
          name: "Deluxe Room",
          base_price: (hotel.base_price || 150) * 1.7,
          display_color: "#22c55e",
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

    console.log(`[v0] Scanning ${competitors.length} competitors for ${scanDays} days`)
    console.log(`[v0] Expected results: ${competitors.length} x ${scanDays} = ${competitors.length * scanDays} minimum`)

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
      availability: boolean
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
    let totalRoomsFound = 0
    let timedOut = false

    for (let dayIndex = 0; dayIndex < scanDays; dayIndex++) {
      if (Date.now() - startTime.getTime() > maxExecutionTime) {
        timedOut = true
        console.log(`[v0] Timeout reached after ${dayIndex} days`)
        break
      }

      if (dayIndex > 0 && dayIndex % 5 === 0) {
        console.log(`[v0] Progress: ${dayIndex}/${scanDays} days. Rooms found: ${totalRoomsFound}`)
      }

      const scanDate = new Date(today)
      scanDate.setDate(scanDate.getDate() + dayOffset + dayIndex)
      const dateStr = scanDate.toISOString().split("T")[0]
      const dayOfWeek = scanDate.getDay()
      const checkOutDate = new Date(scanDate.getTime() + 86400000).toISOString().split("T")[0]

      const demandInfo = getDemandLevel(scanDate)
      const competitorPrices: number[] = []

      for (const competitor of competitors || []) {
        if (Date.now() - startTime.getTime() > maxExecutionTime) {
          timedOut = true
          break
        }

        if (!competitor.booking_url && !competitor.competitor_hotel_name) {
          console.log(`[v0] Skipping competitor - no booking_url or name: ${competitor.id}`)
          continue
        }

        console.log(`[v0] Starting scrape for: ${competitor.competitor_hotel_name || competitor.name}`)

        try {
          const scrapedResult = await scrapeCompetitorAllRooms(
            {
              id: competitor.id,
              competitor_hotel_name: competitor.competitor_hotel_name || competitor.name,
              booking_url: competitor.booking_url,
              city: hotel.city || "Tel Aviv",
            },
            dateStr,
            checkOutDate,
          )

          console.log(
            `[v0] Scrape result for ${competitor.competitor_hotel_name}: success=${scrapedResult.success}, rooms=${scrapedResult.rooms.length}`,
          )

          if (scrapedResult.success && scrapedResult.rooms.length > 0) {
            successfulScrapes++
            totalRoomsFound += scrapedResult.rooms.length
            console.log(`[v0] SUCCESS: ${competitor.competitor_hotel_name} - ${scrapedResult.rooms.length} room types`)

            for (const room of scrapedResult.rooms) {
              competitorPrices.push(room.price)

              competitorPriceResults.push({
                hotel_id: hotelId,
                competitor_id: competitor.id,
                date: dateStr,
                price: room.price,
                source: "Booking.com",
                room_type: room.roomType,
                availability: true,
              })
            }
          } else {
            failedScrapes++
            console.log(`[v0] FAILED: ${competitor.competitor_hotel_name} for ${dateStr}`)
          }
        } catch (error) {
          failedScrapes++
          console.error(`[v0] Scrape error for ${competitor.competitor_hotel_name}:`, error)
        }

        await new Promise((resolve) => setTimeout(resolve, 300))
      }

      for (const roomType of hotelRoomTypes || []) {
        if (roomTypeId && roomType.id !== roomTypeId) continue

        const ourPrice = Math.round(roomType.base_price * demandInfo.multiplier)
        const {
          price: recommendedPrice,
          recommendation,
          action,
        } = calculateRecommendedPrice(ourPrice, competitorPrices, demandInfo.level)

        results.push({
          date: dateStr,
          day_of_week: dayOfWeek,
          demand_level: demandInfo.level,
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

    console.log(`[v0] ========================================`)
    console.log(`[v0] SCAN COMPLETE`)
    console.log(`[v0] Successful scrapes: ${successfulScrapes}`)
    console.log(`[v0] Failed scrapes: ${failedScrapes}`)
    console.log(`[v0] Total rooms found: ${totalRoomsFound}`)
    console.log(`[v0] Records to save: ${competitorPriceResults.length}`)
    console.log(`[v0] ========================================`)

    if (competitorPriceResults.length > 0) {
      console.log(`[v0] Sample record:`, JSON.stringify(competitorPriceResults[0]))

      const batchSize = 100
      let savedCount = 0

      for (let i = 0; i < competitorPriceResults.length; i += batchSize) {
        const batch = competitorPriceResults.slice(i, i + batchSize)

        const { data, error: competitorError } = await supabase.from("competitor_daily_prices").upsert(
          batch.map((r) => ({
            hotel_id: r.hotel_id,
            competitor_id: r.competitor_id,
            date: r.date,
            price: r.price,
            source: r.source,
            room_type: r.room_type,
            availability: r.availability,
            scraped_at: new Date().toISOString(),
          })),
          {
            onConflict: "competitor_id,date,source",
            ignoreDuplicates: false,
          },
        )

        if (competitorError) {
          console.error(`[v0] Batch ${Math.floor(i / batchSize) + 1} error:`, JSON.stringify(competitorError))
        } else {
          savedCount += batch.length
          console.log(`[v0] Saved batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`)
        }
      }

      console.log(`[v0] TOTAL SAVED to competitor_daily_prices: ${savedCount} records`)
    }

    if (results.length > 0) {
      const dailyPricesData = results.map((r) => ({
        hotel_id: hotelId,
        room_type_id: r.room_type_id,
        date: r.date,
        our_price: r.our_price,
        recommended_price: r.recommended_price,
        demand_level: r.demand_level,
        avg_competitor_price: r.competitor_avg,
        min_competitor_price: r.competitor_avg ? Math.round(r.competitor_avg * 0.9) : null,
        max_competitor_price: r.competitor_avg ? Math.round(r.competitor_avg * 1.1) : null,
        price_recommendation: r.recommendation,
        autopilot_action: r.autopilot_action,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }))

      console.log(`[v0] Saving ${dailyPricesData.length} daily_prices records`)
      console.log(`[v0] Sample daily_price:`, JSON.stringify(dailyPricesData[0]))

      const { error: pricesError } = await supabase.from("daily_prices").upsert(dailyPricesData, {
        onConflict: "hotel_id,date,room_type_id",
        ignoreDuplicates: false,
      })

      if (pricesError) {
        console.error("[v0] Error saving daily prices:", JSON.stringify(pricesError))

        // Try inserting one by one with upsert
        let savedDailyCount = 0
        for (const record of dailyPricesData) {
          const { error: singleError } = await supabase.from("daily_prices").upsert(record, {
            onConflict: "hotel_id,date,room_type_id",
            ignoreDuplicates: false,
          })

          if (singleError) {
            console.error(`[v0] Single daily_price error:`, JSON.stringify(singleError))
          } else {
            savedDailyCount++
          }
        }
        console.log(`[v0] Saved ${savedDailyCount}/${dailyPricesData.length} daily_prices individually`)
      } else {
        console.log(`[v0] Successfully saved ${dailyPricesData.length} daily_prices records`)
      }
    }

    const increases = results.filter((r) => r.autopilot_action === "increase").length
    const decreases = results.filter((r) => r.autopilot_action === "decrease").length

    await supabase
      .from("scans")
      .update({
        status: timedOut ? "partial" : "completed",
        completed_at: new Date().toISOString(),
        results_count: competitorPriceResults.length,
      })
      .eq("id", scanRecord.id)

    return NextResponse.json({
      success: true,
      scanId: scanRecord.id,
      message: `Scanned! ${increases} increases, ${decreases} decreases`,
      daysScanned: scanDays,
      timedOut,
      stats: {
        realScrapes: successfulScrapes,
        failedScrapes: failedScrapes,
        totalRoomsFound: totalRoomsFound,
        competitorPricesSaved: competitorPriceResults.length,
        dailyPricesSaved: results.length,
        increaseRecommendations: increases,
        decreaseRecommendations: decreases,
      },
    })
  } catch (error) {
    console.error("[v0] Scraper error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
