import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AutopilotRuleForm } from "./autopilot-form"

export default async function NewAutopilotRulePage() {
  const supabase = await createClient()
  const { data: hotels } = await supabase.from("hotels").select("id, name").order("name")

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Autopilot Rule</CardTitle>
          <CardDescription>Set up automated pricing rules based on market conditions</CardDescription>
        </CardHeader>
        <CardContent>
          <AutopilotRuleForm hotels={hotels || []} />
        </CardContent>
      </Card>
    </div>
  )
}
