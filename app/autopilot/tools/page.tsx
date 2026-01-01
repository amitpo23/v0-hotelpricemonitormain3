import { createClient } from "@/lib/supabase/server"
import { AutopilotTools } from "./autopilot-tools-client"

export const dynamic = 'force-dynamic'

export default async function AutopilotToolsPage() {
  const supabase = await createClient()

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, total_rooms, base_price')
    .order('name')

  if (!hotels || hotels.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">אין מלונות</h1>
          <p className="text-slate-400">נדרש להוסיף מלון תחילה</p>
        </div>
      </div>
    )
  }

  return <AutopilotTools hotels={hotels} />
}
