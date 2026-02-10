import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { logger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    logger.info("[v0] Budget save request body:", { body })

    const { hotelId, year, month, targetRevenue, targetOccupancy, targetAdr } = body

    if (!hotelId || !year || !month || targetRevenue === undefined) {
      logger.info("[v0] Missing required fields:", { hotelId, year, month, targetRevenue })
      return NextResponse.json(
        {
          error: "Missing required fields: hotelId, year, month, targetRevenue",
        },
        { status: 400 },
      )
    }

    // Calculate RevPAR if ADR and occupancy provided
    const targetRevpar = targetAdr && targetOccupancy ? targetAdr * (targetOccupancy / 100) : null

    const { data: existing } = await supabase
      .from("revenue_budgets")
      .select("id")
      .eq("hotel_id", hotelId)
      .eq("year", year)
      .eq("month", month)
      .maybeSingle()

    logger.info("[v0] Existing budget:", { existing })

    let result
    if (existing) {
      logger.info("[v0] Updating existing budget id:", { budgetId: existing.id })
      const { data, error } = await supabase
        .from("revenue_budgets")
        .update({
          target_revenue: targetRevenue,
          target_occupancy: targetOccupancy || null,
          target_adr: targetAdr || null,
          target_revpar: targetRevpar,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single()

      if (error) {
        logger.error("[v0] Update error:", error instanceof Error ? error : new Error(String(error)))
        throw error
      }
      result = data
    } else {
      logger.info("[v0] Creating new budget")
      const { data, error } = await supabase
        .from("revenue_budgets")
        .insert({
          hotel_id: hotelId,
          year,
          month,
          target_revenue: targetRevenue,
          target_occupancy: targetOccupancy || null,
          target_adr: targetAdr || null,
          target_revpar: targetRevpar,
        })
        .select()
        .single()

      if (error) {
        logger.error("[v0] Insert error:", error instanceof Error ? error : new Error(String(error)))
        throw error
      }
      result = data
    }

    logger.info("[v0] Budget saved successfully:", { result })
    return NextResponse.json({ success: true, budget: result })
  } catch (error) {
    logger.error("[v0] Budget save error:", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save budget",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const year = searchParams.get("year") || new Date().getFullYear()
    const month = searchParams.get("month") || new Date().getMonth() + 1

    const { data, error } = await supabase
      .from("revenue_budgets")
      .select("*, hotels(name)")
      .eq("year", year)
      .eq("month", month)

    if (error) throw error

    return NextResponse.json({ budgets: data })
  } catch (error) {
    logger.error("Budget fetch error:", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 })
  }
}
