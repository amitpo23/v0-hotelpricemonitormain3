import { createClient } from "@/lib/supabase/server"
import { BudgetAnalysisClient } from "./budget-analysis-client"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function BudgetAnalysisPage() {
  const supabase = await createClient()

  // Get all hotels
  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, total_rooms, base_price')
    .order('name')

  if (!hotels || hotels.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>אין מלונות</CardTitle>
            <CardDescription>נדרש להוסיף מלון כדי להשתמש בניתוח תקציב</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return <BudgetAnalysisClient hotels={hotels} />
}
