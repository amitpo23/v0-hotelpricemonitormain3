import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { scrapeWithNewApifyActor } from "@/lib/scraper/apify-scraper-integration"
import { scrapeBookingWithApify } from "@/lib/scraper/apify-booking-scraper"
import { scrapeCompetitorAllRooms } from "@/lib/scraper/real-scraper"

// Validate required environment variables
function validateEnvironment() {
  const missing = []
  
  if (!process.env.APIFY_API_KEY) missing.push("APIFY_API_KEY")
  // Note: NEXT_PUBLIC_SUPABASE_URL and service key have hardcoded fallbacks in lib/supabase/server.ts
  // So we only require APIFY_API_KEY for scans to work
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required environment variables: ${missing.join(", ")}. Please configure them in Vercel/Railway settings.`
    }
  }
  
  return { valid: true }
}

// Simulated scraping sources - in production, these would be real scrapers
const BOOKING_SOURCES = [{ name: "Booking.com", baseVariation: 0.95 }]

// Scrape competitor prices from various sources
async function scrapeCompetitorPrices(
  hotelName: string,
  basePrice: number,
  checkIn: string,
  checkOut: string,
  roomType: string,
) {
  const results = []

  // Calculate date-based demand multiplier
  const checkInDate = new Date(checkIn)
  const dayOfWeek = checkInDate.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6
  const demandMultiplier = isWeekend ? 1.15 : 1.0

  // Seasonal multiplier
  const month = checkInDate.getMonth()
  const seasonalMultiplier = [6, 7, 8, 12].includes(month) ? 1.2 : 1.0

  for (const source of BOOKING_SOURCES) {
    // Simulate price variation with realistic factors
    const randomVariation = 0.9 + Math.random() * 0.2 // ±10%
    const price = basePrice * source.baseVariation * demandMultiplier * seasonalMultiplier * randomVariation

    results.push({
      source: source.name,
      price: Math.round(price * 100) / 100,
      currency: "USD",
      availability: Math.random() > 0.1, // 90% availability
      room_type: roomType || "Standard Room",
      metadata: {
        check_in: checkIn,
        check_out: checkOut,
        demand_multiplier: demandMultiplier,
        seasonal_multiplier: seasonalMultiplier,
        scraped_url: `https://${source.name.toLowerCase().replace(/[^a-z]/g, "")}.com/hotel/${hotelName.toLowerCase().replace(/\s+/g, "-")}`,
      },
    })
  }

  return results
}

// Fetch external market data (simulated API call)
async function fetchMarketData(city: string, date: string) {
  // In production, this would call real APIs like:
  // - STR (Smith Travel Research)
  // - OTA Insight
  // - RateGain

  const baseOccupancy = 65 + Math.random() * 25 // 65-90%
  const avgPrice = 100 + Math.random() * 150 // $100-$250

  return {
    city,
    date,
    avg_occupancy_rate: Math.round(baseOccupancy * 10) / 10,
    avg_hotel_price: Math.round(avgPrice * 100) / 100,
    demand_level: baseOccupancy > 80 ? "high" : baseOccupancy > 60 ? "medium" : "low",
    total_hotels_tracked: Math.floor(50 + Math.random() * 100),
  }
}

export async function POST(request: Request) {
  // Validate environment variables first
  const envCheck = validateEnvironment()
  if (!envCheck.valid) {
    console.error("[Scan] Environment validation failed:", envCheck.error)
    return NextResponse.json({ 
      error: envCheck.error,
      hint: "Check Vercel/Railway environment variables settings and redeploy"
    }, { status: 500 })
  }

  const supabase = await createClient()

  let scan: any = null

  try {
    const body = await request.json()
    const { config_id, hotel_id, start_date, days_to_scan, competitor_id } = body

    // Get scan config details
    let configData: any = null
    let hotelData: any = null

    if (config_id) {
      const { data: config } = await supabase.from("scan_configs").select(`*, hotels (*)`).eq("id", config_id).single()

      configData = config
      hotelData = config?.hotels
    } else if (hotel_id) {
      const { data: hotel } = await supabase.from("hotels").select("*").eq("id", hotel_id).single()

      hotelData = hotel
      // Create default config for manual scan
      configData = {
        check_in_date: new Date().toISOString().split("T")[0],
        check_out_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        room_type: "Standard Room",
        guests: 2,
      }
    }

    if (!hotelData) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    // Create scan record
    const { data: scanData, error: scanError } = await supabase
      .from("scans")
      .insert({
        config_id: config_id || null,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (scanError) {
      return NextResponse.json({ error: scanError.message }, { status: 500 })
    }

    scan = scanData

    console.log(`[Scan] Starting REAL scan for hotel: ${hotelData.name}`)

    let competitorsQuery = supabase
      .from("hotel_competitors")
      .select("id, competitor_hotel_name, booking_url, display_color")
      .eq("hotel_id", hotelData.id)
      .eq("is_active", true)
    
    // Filter by specific competitor if provided
    if (competitor_id) {
      competitorsQuery = competitorsQuery.eq("id", competitor_id)
    }
    
    const { data: competitors } = await competitorsQuery

    if (!competitors || competitors.length === 0) {
      console.log("[Scan] No active competitors found")
      await supabase
        .from("scans")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          results_count: 0,
        })
        .eq("id", scan.id)

      return NextResponse.json({
        success: true,
        scan_id: scan.id,
        results_count: 0,
        message: "No active competitors to scan",
      })
    }

    const competitorPrices: any[] = []
    // Allow custom start date, default to today
    const startDate = start_date ? new Date(start_date) : new Date()
    let realScrapeCount = 0

    // Allow custom days to scan, default to 3
    const daysToScan = days_to_scan || 3

    console.log(`[Scan] Found ${competitors.length} active competitors`)
    
    // Check if competitors have booking URLs
    const competitorsWithUrl = competitors.filter(c => c.booking_url && c.booking_url.length > 10)
    console.log(`[Scan] ${competitorsWithUrl.length} competitors have valid booking URLs`)
    
    if (competitorsWithUrl.length === 0) {
      console.warn("[Scan] ⚠️ WARNING: No competitors with booking URLs! Using fallback data.")
    }

    for (let dayOffset = 0; dayOffset < daysToScan; dayOffset++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + dayOffset)
      const checkInDate = date.toISOString().split("T")[0]
      
      const nextDay = new Date(date)
      nextDay.setDate(nextDay.getDate() + 1)
      const checkOutDate = nextDay.toISOString().split("T")[0]

      console.log(`[Scan] Processing date ${dayOffset + 1}/${daysToScan}: ${checkInDate} - ${checkOutDate}`)

      // STEP 1: Scrape our own hotel first (if has URL)
      if (hotelData.competitor_urls && hotelData.competitor_urls.length > 0 && hotelData.competitor_urls[0]) {
        try {
          console.log(`[Scan] 🏨 Scraping OUR hotel: ${hotelData.name}`)
          console.log(`[Scan] URL: ${hotelData.competitor_urls[0].substring(0, 50)}...`)
          
          const ourHotelResult = await scrapeCompetitorAllRooms(
            {
              id: hotelData.id,
              competitor_hotel_name: hotelData.name,
              booking_url: hotelData.competitor_urls[0],
              city: hotelData.location || "Tel Aviv",
            },
            checkInDate,
            checkOutDate,
          )

          if (ourHotelResult.success && ourHotelResult.rooms && ourHotelResult.rooms.length > 0) {
            console.log(`[Scan] ✅ Got ${ourHotelResult.rooms.length} prices for OUR hotel`)
            
            // Save our hotel's actual prices to daily_prices
            for (const room of ourHotelResult.rooms) {
              // We'll update daily_prices with actual prices later
              // For now, just log them
              console.log(`[Scan] 💰 Our price on ${checkInDate}: ${room.price} ${room.currency} (${room.roomType})`)
            }
          } else {
            console.log(`[Scan] ⚠️ Failed to scrape our hotel: ${ourHotelResult.error || 'No results'}`)
          }
        } catch (error) {
          console.error(`[Scan] ❌ Error scraping our hotel:`, error instanceof Error ? error.message : error)
        }
      } else {
        console.log(`[Scan] ⚠️ Our hotel has no Booking.com URL configured`)
      }

      // STEP 2: Scrape each competitor using Python scraper (working method)
      for (const competitor of competitorsWithUrl) {
        try {
          console.log(`[Scan] Scraping ${competitor.competitor_hotel_name}`)
          console.log(`[Scan] URL: ${competitor.booking_url?.substring(0, 50)}...`)
          
          const result = await scrapeCompetitorAllRooms(
            {
              id: competitor.id,
              competitor_hotel_name: competitor.competitor_hotel_name,
              booking_url: competitor.booking_url,
              city: hotelData.city || "Tel Aviv",
            },
            checkInDate,
            checkOutDate,
          )

          if (result.success && result.rooms && result.rooms.length > 0) {
            realScrapeCount++
            console.log(`[Scan] ✅ Got ${result.rooms.length} results for ${competitor.competitor_hotel_name}`)
            
            for (const room of result.rooms) {
              competitorPrices.push({
                hotel_id: hotelData.id,
                competitor_id: competitor.id,
                date: checkInDate,
                price: room.price,
                currency: room.currency || 'ILS',
                source: result.source || "Booking.com",
                room_type: room.roomType || "Standard Room",
                availability: room.available !== false,
                scraped_at: new Date().toISOString(),
              })
            }
          } else {
            console.log(`[Scan] ❌ Failed: ${result.error || 'No results'} - skipping (no fallback)`)
          }
        } catch (error) {
          console.error(`[Scan] ⚠️ Error scraping ${competitor.competitor_hotel_name}:`, error instanceof Error ? error.message : error)
          console.log(`[Scan] Skipping competitor (no fallback data)`)
        }
      }

            // OLD CODE - TO BE REMOVED:
            /*
      for (const competitor of competitors) {
        console.log(`[Scan] Scraping ${competitor.competitor_hotel_name} for ${dateStr}`)

        const scrapedResult = await scrapeCompetitorAllRooms(
          competitor.id,
          competitor.competitor_hotel_name,
          dateStr,
          competitor.booking_url,
        )

        if (scrapedResult?.success && scrapedResult.rooms && scrapedResult.rooms.length > 0) {
          realScrapeCount++

          for (const room of scrapedResult.rooms) {
            competitorPrices.push({
              hotel_id: hotelData.id,
              competitor_id: competitor.id,
              date: dateStr,
              price: room.price,
              source: scrapedResult.source || "Booking.com",
              room_type: room.roomType || "Standard Room",
              availability: room.available !== false,
              scraped_at: new Date().toISOString(),
            })
          }
        } else {
          console.log(`[Scan] No results for ${competitor.competitor_hotel_name} on ${dateStr}`)
        }
      }
            */
    }

    console.log(`[Scan] Completed ${realScrapeCount} real scrapes, got ${competitorPrices.length} prices`)

    // Save to database only if we have real data
    if (competitorPrices.length > 0) {
      // Step 1: Get existing prices to detect changes
      const uniqueDates = [...new Set(competitorPrices.map(p => p.date))]
      const competitorIds = [...new Set(competitorPrices.map(p => p.competitor_id))]
      
      console.log(`[Scan] Fetching existing prices for ${competitorIds.length} competitors and ${uniqueDates.length} dates`)
      
      const { data: existingPrices } = await supabase
        .from("competitor_daily_prices")
        .select("competitor_id, date, price, room_type, source")
        .in("competitor_id", competitorIds)
        .in("date", uniqueDates)

      console.log(`[Scan] Found ${existingPrices?.length || 0} existing prices`)

      // Step 2: Detect price changes
      const priceChanges: any[] = []
      
      for (const newPrice of competitorPrices) {
        const oldPrice = existingPrices?.find(
          p => 
            p.competitor_id === newPrice.competitor_id && 
            p.date === newPrice.date && 
            p.room_type === newPrice.room_type &&
            p.source === newPrice.source
        )
        
        if (oldPrice && oldPrice.price !== newPrice.price) {
          const change = newPrice.price - oldPrice.price
          const changePercent = (change / oldPrice.price) * 100
          
          priceChanges.push({
            hotel_id: newPrice.hotel_id,
            competitor_id: newPrice.competitor_id,
            date: newPrice.date,
            old_price: oldPrice.price,
            new_price: newPrice.price,
            price_change: change,
            change_percent: changePercent,
            source: newPrice.source,
            room_type: newPrice.room_type,
            recorded_at: new Date().toISOString()
          })
          
          console.log(`[Scan] 💰 Price change detected: ${oldPrice.price} → ${newPrice.price} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%)`)
        }
      }

      // Step 3: Save price changes to history
      if (priceChanges.length > 0) {
        console.log(`[Scan] Saving ${priceChanges.length} price changes to history`)
        const { error: historyError } = await supabase
          .from("competitor_price_history")
          .insert(priceChanges)
        
        if (historyError) {
          console.error("[Scan] Error saving price history:", historyError)
        } else {
          console.log(`[Scan] ✅ Saved ${priceChanges.length} price changes`)
        }
      } else {
        console.log("[Scan] No price changes detected")
      }

      // Step 4: Save competitor prices
      for (let i = 0; i < competitorPrices.length; i += 100) {
        const batch = competitorPrices.slice(i, i + 100)
        const { error: upsertError } = await supabase.from("competitor_daily_prices").upsert(batch, {
          onConflict: "competitor_id,date,source,room_type",
          ignoreDuplicates: false,
        })

        if (upsertError) {
          console.error("[Scan] Error upserting competitor prices:", upsertError)
        } else {
          console.log(`[Scan] Saved ${batch.length} real prices (batch ${Math.floor(i / 100) + 1})`)
        }
      }

      // Step 5: Calculate and save daily_prices (recommendations)
      console.log("[Scan] Calculating daily price recommendations...")
      
      // Group prices by date
      const pricesByDate: Record<string, number[]> = {}
      for (const price of competitorPrices) {
        if (!pricesByDate[price.date]) {
          pricesByDate[price.date] = []
        }
        pricesByDate[price.date].push(price.price)
      }

      const dailyPricesData: any[] = []
      
      for (const [dateStr, prices] of Object.entries(pricesByDate)) {
        const avgCompetitor = prices.reduce((sum, p) => sum + p, 0) / prices.length
        const minCompetitor = Math.min(...prices)
        const maxCompetitor = Math.max(...prices)
        
        // Simple recommendation logic (can be enhanced)
        const ourBasePrice = hotelData.base_price || 150
        let recommendedPrice = avgCompetitor
        let priceRecommendation = "maintain"
        let autopilotAction = "maintain"
        
        if (ourBasePrice < avgCompetitor * 0.9) {
          recommendedPrice = avgCompetitor * 0.95
          priceRecommendation = `Increase - currently ${((1 - ourBasePrice / avgCompetitor) * 100).toFixed(0)}% below market`
          autopilotAction = "increase"
        } else if (ourBasePrice > avgCompetitor * 1.15) {
          recommendedPrice = avgCompetitor * 1.05
          priceRecommendation = `Decrease - currently ${((ourBasePrice / avgCompetitor - 1) * 100).toFixed(0)}% above market`
          autopilotAction = "decrease"
        }
        
        // Determine demand level based on price variance
        const priceStdDev = Math.sqrt(
          prices.reduce((sum, p) => sum + Math.pow(p - avgCompetitor, 2), 0) / prices.length
        )
        const variance = (priceStdDev / avgCompetitor) * 100
        
        let demandLevel = "medium"
        if (avgCompetitor > ourBasePrice * 1.2 || variance > 20) {
          demandLevel = "high"
        } else if (avgCompetitor < ourBasePrice * 0.8) {
          demandLevel = "low"
        }
        
        dailyPricesData.push({
          hotel_id: hotelData.id,
          date: dateStr,
          our_price: ourBasePrice,
          recommended_price: Math.round(recommendedPrice),
          min_competitor_price: Math.round(minCompetitor),
          max_competitor_price: Math.round(maxCompetitor),
          avg_competitor_price: Math.round(avgCompetitor),
          demand_level: demandLevel,
          price_recommendation: priceRecommendation,
          autopilot_action: autopilotAction,
          updated_at: new Date().toISOString()
        })
      }

      // Save daily prices
      if (dailyPricesData.length > 0) {
        console.log(`[Scan] Saving ${dailyPricesData.length} daily price recommendations`)
        
        for (const record of dailyPricesData) {
          const { error: dailyError } = await supabase
            .from("daily_prices")
            .upsert(record, {
              onConflict: "hotel_id,date",
              ignoreDuplicates: false
            })
          
          if (dailyError) {
            console.error("[Scan] Error saving daily_price:", dailyError)
          }
        }
        
        console.log("[Scan] ✅ Daily prices saved")
      }
    }

    // Update scan status
    await supabase
      .from("scans")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        results_count: competitorPrices.length,
      })
      .eq("id", scan.id)

    const avgPrice =
      competitorPrices.length > 0 ? competitorPrices.reduce((sum, r) => sum + r.price, 0) / competitorPrices.length : 0

    return NextResponse.json({
      success: true,
      scan_id: scan.id,
      results_count: competitorPrices.length,
      real_scrapes: realScrapeCount,
      summary: {
        min_price: competitorPrices.length > 0 ? Math.min(...competitorPrices.map((r) => r.price)) : 0,
        max_price: competitorPrices.length > 0 ? Math.max(...competitorPrices.map((r) => r.price)) : 0,
        avg_price: avgPrice,
        competitors_scanned: competitors?.length || 0,
        days_scanned: daysToScan,
      },
    })
  } catch (error) {
    console.error("[Scan] Scan execution error:", error)

    if (scan?.id) {
      try {
        await supabase
          .from("scans")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : "Unknown error occurred",
          })
          .eq("id", scan.id)
        console.log("[Scan] Updated scan status to failed")
      } catch (updateError) {
        console.error("[Scan] Failed to update scan status:", updateError)
      }
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to execute scan",
      },
      { status: 500 },
    )
  }
}
