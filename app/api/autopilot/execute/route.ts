import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  const supabase = await createClient()

  // Get all active autopilot rules
  const { data: rules } = await supabase
    .from("autopilot_rules")
    .select("*, hotels(*)")
    .eq("is_active", true)
    .order("priority", { ascending: true })

  if (!rules || rules.length === 0) {
    return NextResponse.json({ message: "No active autopilot rules" })
  }

  const executionLogs: any[] = []
  const alerts: any[] = []

  for (const rule of rules) {
    const hotel = rule.hotels
    if (!hotel) continue

    // Get REAL competitor prices from scraper
    const { data: competitors } = await supabase
      .from("hotel_competitors")
      .select("id")
      .eq("hotel_id", hotel.id)
      .eq("is_active", true)

    const competitorIds = competitors?.map((c) => c.id) || []

    const today = new Date().toISOString().split("T")[0]
    const { data: competitorPrices } = await supabase
      .from("competitor_daily_prices")
      .select("price")
      .in("competitor_id", competitorIds)
      .eq("date", today)

    const avgCompetitorPrice =
      competitorPrices && competitorPrices.length > 0
        ? competitorPrices.reduce((sum: number, r: any) => sum + Number(r.price), 0) / competitorPrices.length
        : null

    // Skip if no real competitor data
    if (!avgCompetitorPrice) {
      continue
    }

    let shouldExecute = false
    let newPrice = hotel.base_price
    let actionDescription = ""

    // Check trigger conditions using REAL data only
    switch (rule.trigger_type) {
      case "competitor_undercut":
        const threshold = rule.trigger_value?.percentage || 10
        if (hotel.base_price) {
          const priceDiff = ((hotel.base_price - avgCompetitorPrice) / hotel.base_price) * 100
          if (priceDiff > threshold) {
            shouldExecute = true
            actionDescription = `Competitors are ${priceDiff.toFixed(1)}% cheaper (avg: ₪${avgCompetitorPrice.toFixed(0)})`
          }
        }
        break

      case "occupancy_threshold":
        // Get real occupancy from bookings
        const { data: bookings } = await supabase
          .from("bookings")
          .select("id")
          .eq("hotel_id", hotel.id)
          .eq("check_in_date", today)
          .eq("status", "confirmed")

        const bookedRooms = bookings?.length || 0
        const totalRooms = hotel.total_rooms || 50
        const occupancy = (bookedRooms / totalRooms) * 100

        const minOccupancy = rule.trigger_value?.min_occupancy || 50
        if (occupancy < minOccupancy) {
          shouldExecute = true
          actionDescription = `Real occupancy at ${occupancy.toFixed(0)}% (${bookedRooms}/${totalRooms} rooms)`
        }
        break

      case "demand_spike":
        // Check for real demand trends from competitor prices
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
        const { data: weekPrices } = await supabase
          .from("competitor_daily_prices")
          .select("price, date")
          .in("competitor_id", competitorIds)
          .gte("date", weekAgo)
          .lte("date", today)

        if (weekPrices && weekPrices.length > 0) {
          const avgWeekPrice = weekPrices.reduce((sum, p) => sum + p.price, 0) / weekPrices.length
          if (avgCompetitorPrice > avgWeekPrice * 1.15) {
            shouldExecute = true
            actionDescription = `Demand spike: prices up ${((avgCompetitorPrice / avgWeekPrice - 1) * 100).toFixed(0)}% from last week`
          }
        }
        break
    }

    if (!shouldExecute) continue

    // Execute action
    switch (rule.action_type) {
      case "adjust_price":
        const adjustment = rule.action_value?.percentage || 5
        const direction = rule.action_value?.direction || "decrease"
        newPrice = hotel.base_price * (1 + (direction === "increase" ? adjustment : -adjustment) / 100)

        // Apply constraints
        if (rule.min_price && newPrice < rule.min_price) newPrice = rule.min_price
        if (rule.max_price && newPrice > rule.max_price) newPrice = rule.max_price

        // Update hotel price
        await supabase
          .from("hotels")
          .update({ base_price: Math.round(newPrice), updated_at: new Date().toISOString() })
          .eq("id", hotel.id)

        executionLogs.push({
          rule_id: rule.id,
          hotel_id: hotel.id,
          action_taken: `${rule.name}: ${actionDescription}`,
          old_price: hotel.base_price,
          new_price: Math.round(newPrice),
          trigger_data: { trigger: rule.trigger_type, condition: actionDescription },
        })
        break

      case "send_alert":
        alerts.push({
          hotel_id: hotel.id,
          alert_type: "autopilot",
          message: `${rule.name}: ${actionDescription}`,
          severity: "info",
        })
        break

      case "match_competitor":
        newPrice = avgCompetitorPrice
        if (rule.min_price && newPrice < rule.min_price) newPrice = rule.min_price
        if (rule.max_price && newPrice > rule.max_price) newPrice = rule.max_price

        await supabase
          .from("hotels")
          .update({ base_price: Math.round(newPrice), updated_at: new Date().toISOString() })
          .eq("id", hotel.id)

        executionLogs.push({
          rule_id: rule.id,
          hotel_id: hotel.id,
          action_taken: `${rule.name}: Matched competitor price`,
          old_price: hotel.base_price,
          new_price: Math.round(newPrice),
          trigger_data: { avg_competitor: avgCompetitorPrice },
        })
        break
    }
  }

  // Save execution logs
  if (executionLogs.length > 0) {
    await supabase.from("autopilot_logs").insert(executionLogs)
  }

  // Save alerts
  if (alerts.length > 0) {
    await supabase.from("pricing_alerts").insert(alerts)
  }

  return NextResponse.json({
    success: true,
    rulesProcessed: rules.length,
    actionsExecuted: executionLogs.length,
    alertsCreated: alerts.length,
  })
}
