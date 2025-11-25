import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()

  // Get recent scan results
  const { data: recentScans } = await supabase
    .from("scan_results")
    .select("*, hotels(name)")
    .order("scraped_at", { ascending: false })
    .limit(500)

  if (!recentScans || recentScans.length === 0) {
    return NextResponse.json({ message: "No scan data to analyze" })
  }

  const trends: any[] = []
  const hotelPrices: Record<string, number[]> = {}

  // Group prices by hotel
  recentScans.forEach((scan: any) => {
    if (!hotelPrices[scan.hotel_id]) {
      hotelPrices[scan.hotel_id] = []
    }
    hotelPrices[scan.hotel_id].push(Number(scan.price))
  })

  // Analyze trends for each hotel
  for (const [hotelId, prices] of Object.entries(hotelPrices)) {
    if (prices.length < 5) continue

    const recentPrices = prices.slice(0, Math.floor(prices.length / 2))
    const olderPrices = prices.slice(Math.floor(prices.length / 2))

    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length
    const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100

    // Detect significant trends (>5% change)
    if (Math.abs(percentChange) > 5) {
      const trendType = percentChange > 0 ? "price_increase" : "price_decrease"

      trends.push({
        hotel_id: hotelId,
        trend_date: new Date().toISOString().split("T")[0],
        trend_type: trendType,
        trend_value: recentAvg,
        percentage_change: Math.round(percentChange * 100) / 100,
        description: `${percentChange > 0 ? "Price increased" : "Price decreased"} by ${Math.abs(percentChange).toFixed(1)}% in recent scans`,
      })

      // Create alert for significant price changes
      if (Math.abs(percentChange) > 10) {
        await supabase.from("pricing_alerts").insert({
          hotel_id: hotelId,
          alert_type: trendType,
          message: `Significant ${percentChange > 0 ? "increase" : "decrease"} of ${Math.abs(percentChange).toFixed(1)}% detected in competitor prices`,
          severity: Math.abs(percentChange) > 20 ? "error" : "warning",
        })
      }
    }

    // Detect demand spikes (high price variance)
    const priceVariance = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - recentAvg, 2), 0) / prices.length)

    if (priceVariance > recentAvg * 0.15) {
      trends.push({
        hotel_id: hotelId,
        trend_date: new Date().toISOString().split("T")[0],
        trend_type: "demand_spike",
        trend_value: priceVariance,
        percentage_change: null,
        description: "High price volatility detected - possible demand spike",
      })
    }
  }

  // Insert detected trends
  if (trends.length > 0) {
    await supabase.from("market_trends").insert(trends)
  }

  return NextResponse.json({
    success: true,
    trendsDetected: trends.length,
    message: `Analyzed ${Object.keys(hotelPrices).length} hotels, detected ${trends.length} trends`,
  })
}
