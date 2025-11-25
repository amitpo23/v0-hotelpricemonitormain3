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

    // Get latest scan results for this hotel's competitors
    const { data: competitorPrices } = await supabase
      .from("scan_results")
      .select("*")
      .eq("hotel_id", hotel.id)
      .order("scraped_at", { ascending: false })
      .limit(10)

    const avgCompetitorPrice =
      competitorPrices && competitorPrices.length > 0
        ? competitorPrices.reduce((sum: number, r: any) => sum + Number(r.price), 0) / competitorPrices.length
        : null

    let shouldExecute = false
    let newPrice = hotel.base_price
    let actionDescription = ""

    // Check trigger conditions
    switch (rule.trigger_type) {
      case "competitor_undercut":
        const threshold = rule.trigger_value?.percentage || 10
        if (avgCompetitorPrice && hotel.base_price) {
          const priceDiff = ((hotel.base_price - avgCompetitorPrice) / hotel.base_price) * 100
          if (priceDiff > threshold) {
            shouldExecute = true
            actionDescription = `Competitors are ${priceDiff.toFixed(1)}% cheaper`
          }
        }
        break

      case "occupancy_threshold":
        // Would need real occupancy data - simulating for now
        const occupancy = Math.random() * 100
        const minOccupancy = rule.trigger_value?.min_occupancy || 50
        if (occupancy < minOccupancy) {
          shouldExecute = true
          actionDescription = `Occupancy at ${occupancy.toFixed(0)}%, below threshold`
        }
        break

      case "demand_spike":
        // Check for recent demand trends
        const { data: trends } = await supabase
          .from("market_trends")
          .select("*")
          .eq("hotel_id", hotel.id)
          .eq("trend_type", "demand_spike")
          .gte("detected_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1)

        if (trends && trends.length > 0) {
          shouldExecute = true
          actionDescription = "Demand spike detected in market"
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
        if (avgCompetitorPrice) {
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
        }
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
