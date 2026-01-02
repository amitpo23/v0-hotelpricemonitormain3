import { createClient } from "@/lib/supabase/server"
import { RulesClient } from "./rules-client"

export default async function RulesPage() {
  const supabase = await createClient()

  // Fetch hotels with their current settings
  const { data: hotels } = await supabase
    .from("hotels")
    .select("id, name, total_rooms, base_price, min_price, max_price")
    .order("name")

  return <RulesClient hotels={hotels || []} />
}
