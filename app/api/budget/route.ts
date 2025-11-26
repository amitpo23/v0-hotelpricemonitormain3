import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { hotelId, year, month, targetRevenue, targetOccupancy, targetAdr } = await request.json()

    // Calculate RevPAR if ADR and occupancy provided
    const targetRevpar = targetAdr && targetOccupancy ? targetAdr * (targetOccupancy / 100) : null

    const { data, error } = await supabase
      .from("revenue_budgets")
      .upsert(
        {
          hotel_id: hotelId,
          year,
          month,
          target_revenue: targetRevenue,
          target_occupancy: targetOccupancy,
          target_adr: targetAdr,
          target_revpar: targetRevpar,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "hotel_id,year,month",
        },
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, budget: data })
  } catch (error) {
    console.error("Budget save error:", error)
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 })
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
