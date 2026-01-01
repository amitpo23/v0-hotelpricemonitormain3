import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: predictions, error } = await supabase
      .from("price_predictions")
      .select("id, hotel_id, prediction_date, predicted_price, confidence_score, predicted_demand, recommendation, created_at")
      .order("prediction_date", { ascending: false })
      .limit(500)

    if (error) {
      console.error('[API] Error fetching predictions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(predictions || [])
  } catch (error) {
    console.error('[API] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
