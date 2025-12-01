import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    console.log("[v0] Budget save request body:", JSON.stringify(body))

    const { hotelId, year, month, targetRevenue, targetOccupancy, targetAdr } = body

    if (!hotelId || !year || !month || targetRevenue === undefined) {
      console.log("[v0] Missing required fields:", { hotelId, year, month, targetRevenue })
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

    console.log("[v0] Existing budget:", existing)

    let result
    if (existing) {
      console.log("[v0] Updating existing budget id:", existing.id)
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
        console.log("[v0] Update error:", error)
        throw error
      }
      result = data
    } else {
      console.log("[v0] Creating new budget")
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
        console.log("[v0] Insert error:", error)
        throw error
      }
      result = data
    }

    console.log("[v0] Budget saved successfully:", result)
    return NextResponse.json({ success: true, budget: result })
  } catch (error) {
    console.error("[v0] Budget save error:", error)
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
    console.error("Budget fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 })
  }
}
