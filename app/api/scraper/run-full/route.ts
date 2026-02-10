import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"
import { NextResponse } from "next/server"

const SCAN_DAYS = 45 // Scan 45 days forwar
const TIMEOUT_MS = 600000 // 10 minutes timeout for serial scraping
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
  logger.info("[v0] Booking.com Scraper started at:", { startedAt: startTime.toISOString() })

  let scanRecord: any = null

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

    const { data: scanRecordData, error: scanError } = await supabase
      .from("scans")
      .insert({
        config_id: null,
        status: "running",
        started_at: startTime.toISOString(),
      })
      .select()
      .single()

    if (scanError || !scanRecordData) {
      return NextResponse.json({ error: "Failed to create scan record" }, { status: 500 })
    }

    scanRecord = scanRecordData

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

    logger.info(`[v0] Scanning ${competitors.length} competitors for ${scanDays} days`)
    logger.info(`[v0] Expected results: ${competitors.length} x ${scanDays} = ${competitors.length * scanDays} minimum`)

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
      room_name: string
      availability: boolean
      original_price: number | null
      meal_plan: string | null
      max_occupancy: number | null
      raw_data: any | null
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

    const activeCompetitors = competitors.filter((c: any) => c.is_active)

    logger.info(`[v0] Starting scrape for ${activeCompetitors.length} active competitors over ${scanDays} days`)

    const datesToScan = []
    for (let i = dayOffset; i < dayOffset + scanDays; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      datesToScan.push(date)
    }

    logger.info(
      `[v0] Will scan ${datesToScan.length} dates from ${datesToScan[0].toISOString().split("T")[0]} to ${datesToScan[datesToScan.length - 1].toISOString().split("T")[0]}`,
    )

    const { scrapeCompetitorAllRoomsWithRetry, scrapeMultipleCompetitorsWithRetry } = await import("@/lib/scraper/real-scraper")

    const scrapedData: Array<{
      competitorId: string
      competitorName: string
      date: string
      checkOut: string
      success: boolean
      rooms: any[]
      source: string
      error?: string
    }> = []

    for (const date of datesToScan) {
      const timeElapsed = Date.now() - startTime.getTime()
      const timeRemaining = maxExecutionTime - timeElapsed

      if (timeRemaining < 10000) {
        // Need at least 10 seconds remaining
        timedOut = true
        logger.info(`[v0] Timeout approaching at date ${date.toISOString().split("T")[0]}, stopping scan`)
        break
      }

      const checkInStr = date.toISOString().split("T")[0]
      const checkOutDate = new Date(date)
      checkOutDate.setDate(checkOutDate.getDate() + 1)
      const checkOutStr = checkOutDate.toISOString().split("T")[0]

      logger.info(`[v0] Scraping date: ${checkInStr} for ${activeCompetitors.length} competitors`)

      // Use serial scraping to avoid too many concurrent Chromium processes
      const scrapedResults = await scrapeMultipleCompetitorsWithRetry(
        activeCompetitors,
        checkInStr,
        checkOutStr,
        2, // Reduced retries from 3 to 2 to save time
      )

      for (let i = 0; i < scrapedResults.length; i++) {
        const competitorResult = scrapedResults[i]
        const competitor = activeCompetitors[i]

        if (competitorResult.success) {
          scrapedData.push({
            competitorId: competitorResult.competitorId,
            competitorName: competitorResult.competitorName,
            date: competitorResult.date,
            checkOut: checkOutStr,
            success: competitorResult.success,
            rooms: competitorResult.rooms,
            source: competitorResult.source,
            error: competitorResult.errorMessage,
          })
        } else {
          logger.info(`[v0] Competitor ${competitor.competitor_hotel_name} failed: ${competitorResult.errorMessage}`)
          scrapedData.push({
            competitorId: competitor.id,
            competitorName: competitor.competitor_hotel_name,
            date: checkInStr,
            checkOut: checkOutStr,
            success: false,
            rooms: [],
            source: "error",
            error: competitorResult.errorMessage || "Scrape failed",
          })
        }
      }

      logger.info(
        `[v0] Completed ${checkInStr}: ${scrapedData.filter((r) => r.success).length}/${activeCompetitors.length} successful`,
      )
    }

    logger.info(`[v0] Processing ${scrapedData.length} scrape results`)

    for (const competitorResult of scrapedData) {
      if (Date.now() - startTime.getTime() > maxExecutionTime) {
        timedOut = true
        logger.info(`[v0] Timeout reached after processing competitor ${competitorResult.competitorName}`)
        break
      }

      if (competitorResult.success && competitorResult.rooms.length > 0) {
        successfulScrapes++
        totalRoomsFound += competitorResult.rooms.length
        logger.info(`[v0] SUCCESS: ${competitorResult.competitorName} - ${competitorResult.rooms.length} room types`)

        for (const room of competitorResult.rooms) {
          competitorPriceResults.push({
            hotel_id: hotelId,
            competitor_id: competitorResult.competitorId,
            date: competitorResult.date,
            price: room.price,
            source: room.source || "Booking.com",
            room_type: room.roomType,
            room_name: room.roomName || room.roomType,
            availability: room.available,
            original_price: room.originalPrice || null,
            meal_plan: room.mealPlan || null,
            max_occupancy: room.maxOccupancy || null,
            raw_data: room.rawData || null,
          })
        }
      } else {
        failedScrapes++
        logger.info(
          `[v0] FAILED: ${competitorResult.competitorName} for ${competitorResult.date} - ${competitorResult.error}`,
        )
      }
    }

    logger.info(`[v0] ========================================`)
    logger.info(`[v0] SCAN COMPLETE`)
    logger.info(`[v0] Successful scrapes: ${successfulScrapes}`)
    logger.info(`[v0] Failed scrapes: ${failedScrapes}`)
    logger.info(`[v0] Total rooms found: ${totalRoomsFound}`)
    logger.info(`[v0] Records to save: ${competitorPriceResults.length}`)
    logger.info(`[v0] ========================================`)

    if (competitorPriceResults.length > 0) {
      logger.info(`[v0] Sample record:`, { sampleRecord: JSON.stringify(competitorPriceResults[0]) })

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
            room_name: r.room_name,
            availability: r.availability,
            original_price: r.original_price,
            meal_plan: r.meal_plan,
            max_occupancy: r.max_occupancy,
            raw_data: r.raw_data,
            scraped_at: new Date().toISOString(),
          })),
          {
            onConflict: "hotel_id,competitor_id,date,source,room_type",
            ignoreDuplicates: false,
          },
        )

        if (competitorError) {
          logger.error(`[v0] Batch ${Math.floor(i / batchSize) + 1} error:`, new Error(JSON.stringify(competitorError)))
        } else {
          savedCount += batch.length
          logger.info(`[v0] Saved batch ${Math.floor(i / batchSize) + 1}: ${batch.length} records`)
        }
      }

      logger.info(`[v0] TOTAL SAVED to competitor_daily_prices: ${savedCount} records`)

      logger.info(`[v0] ========== SCAN_RESULTS DEBUG ==========`)
      logger.info(`[v0] scrapedData length: ${scrapedData.length}`)
      if (scrapedData.length > 0) {
        logger.info(`[v0] scrapedData sample:`, { scrapedDataSample: JSON.stringify(scrapedData[0], null, 2) })
      }

      logger.info(`[v0] Saving to scan_results from ${scrapedData.length} scrape results`)

      const scanResultsData = []
      for (const competitorResult of scrapedData) {
        logger.info(
          `[v0] Processing competitor: ${competitorResult.competitorName}, success: ${competitorResult.success}, rooms: ${competitorResult.rooms?.length || 0}`,
        )

        if (!competitorResult.success || !competitorResult.rooms || competitorResult.rooms.length === 0) {
          logger.info(`[v0] Skipping ${competitorResult.competitorName} - no successful data`)
          continue // Skip failed scrapes
        }

        const checkInDate = competitorResult.date
        const checkOutDate = competitorResult.checkOut

        for (const room of competitorResult.rooms) {
          scanResultsData.push({
            scan_id: scanRecord.id,
            hotel_id: hotel.id,
            competitor_name: competitorResult.competitorName,
            source: room.source || "Booking.com",
            price: room.price.toString(),
            room_type: room.roomType,
            availability: room.available,
            scraped_at: new Date().toISOString(),
            metadata: {
              check_in: checkInDate,
              check_out: checkOutDate,
              competitor_id: competitorResult.competitorId,
              competitor_name: competitorResult.competitorName,
              room_name: room.roomName || room.roomType,
              original_price: room.originalPrice || room.price,
              meal_plan: room.mealPlan || (room.hasBreakfast ? "Breakfast included" : null),
              max_occupancy: room.maxOccupancy || null,
              method: competitorResult.source,
              currency: room.currency || "ILS",
            },
          })
        }
      }

      logger.info(`[v0] Prepared ${scanResultsData.length} scan_results records to save`)
      if (scanResultsData.length > 0) {
        logger.info(`[v0] Sample scan_results record:`, { sampleScanResult: JSON.stringify(scanResultsData[0], null, 2) })
      }

      if (scanResultsData.length > 0) {
        const { data: scanResultsInserted, error: scanResultsError } = await supabase
          .from("scan_results")
          .insert(scanResultsData)

        if (scanResultsError) {
          logger.error(`[v0] scan_results error:`, new Error(JSON.stringify(scanResultsError)))
        } else {
          logger.info(`[v0] SUCCESS: Saved ${scanResultsData.length} records to scan_results`)
        }
      } else {
        logger.info(`[v0] WARNING: No successful scrapes to save to scan_results`)
      }
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

      logger.info(`[v0] Saving ${dailyPricesData.length} daily_prices records`)
      logger.info(`[v0] Sample daily_price:`, { sampleDailyPrice: JSON.stringify(dailyPricesData[0]) })

      let savedDailyCount = 0
      for (const record of dailyPricesData) {
        await supabase
          .from("daily_prices")
          .delete()
          .eq("hotel_id", record.hotel_id)
          .eq("date", record.date)
          .eq("room_type_id", record.room_type_id)

        const { error: singleError } = await supabase.from("daily_prices").insert(record)

        if (singleError) {
          logger.error(`[v0] Single daily_price error:`, new Error(JSON.stringify(singleError)))
        } else {
          savedDailyCount++
        }
      }

      logger.info(`[v0] Saved ${savedDailyCount}/${dailyPricesData.length} daily_prices individually`)
    }

    const increases = results.filter((r: any) => r.autopilot_action === "increase").length
    const decreases = results.filter((r: any) => r.autopilot_action === "decrease").length

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
    logger.error("[v0] Scraper error:", error instanceof Error ? error : new Error(String(error)))

    if (scanRecord?.id) {
      try {
        const supabase = await createClient()
        await supabase
          .from("scans")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : "Unknown error occurred",
          })
          .eq("id", scanRecord.id)
        logger.info("[v0] Updated scan status to failed")
      } catch (updateError) {
        logger.error("[v0] Failed to update scan status:", updateError instanceof Error ? updateError : new Error(String(updateError)))
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    )
  }
}
