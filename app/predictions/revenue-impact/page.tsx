import { createClient } from "@/lib/supabase/server"
import RevenueImpactClient from "./revenue-impact-client"

export default async function RevenueImpactPage() {
  const supabase = await createClient()

  // Fetch hotels for selection
  const { data: hotels } = await supabase
    .from("hotels")
    .select("id, name, base_price, total_rooms")
    .order("name")

  // Fetch recent predictions (last 90 days forward)
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + 90)

  const { data: predictions } = await supabase
    .from("price_predictions")
    .select("*")
    .gte("prediction_date", today.toISOString().split('T')[0])
    .lte("prediction_date", futureDate.toISOString().split('T')[0])
    .order("prediction_date")

  return (
    <RevenueImpactClient 
      hotels={hotels || []}
      predictions={predictions || []}
    />
  )
}
