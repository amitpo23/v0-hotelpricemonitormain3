import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Zap, Plus, Settings, TrendingUp, TrendingDown, Target, DollarSign, Activity } from "lucide-react"

export default async function AutopilotPage() {
  const supabase = await createClient()

  const [{ data: rules }, { data: hotels }, { data: logs }] = await Promise.all([
    supabase.from("autopilot_rules").select("*").order("priority", { ascending: true }),
    supabase.from("hotels").select("id, name"),
    supabase.from("autopilot_logs").select("*").order("executed_at", { ascending: false }).limit(20),
  ])

  const hotelMap = new Map(hotels?.map((h) => [h.id, h.name]) || [])

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "competitor_undercut":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case "occupancy_threshold":
        return <Target className="h-4 w-4 text-blue-500" />
      case "demand_spike":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      default:
        return <Activity className="h-4 w-4 text-purple-500" />
    }
  }

  const getActionBadge = (type: string) => {
    switch (type) {
      case "adjust_price":
        return <Badge className="bg-green-100 text-green-800">Adjust Price</Badge>
      case "send_alert":
        return <Badge className="bg-yellow-100 text-yellow-800">Send Alert</Badge>
      case "match_competitor":
        return <Badge className="bg-blue-100 text-blue-800">Match Competitor</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Zap className="h-10 w-10 text-yellow-500" />
            Autopilot
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Automated pricing rules that work 24/7 to optimize your revenue
          </p>
        </div>
        <Link href="/autopilot/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Rule
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 mb-1">Total Rules</div>
            <div className="text-3xl font-bold">{rules?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 mb-1">Active Rules</div>
            <div className="text-3xl font-bold text-green-600">
              {rules?.filter((r: any) => r.is_active).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 mb-1">Actions Today</div>
            <div className="text-3xl font-bold text-blue-600">
              {logs?.filter((l: any) => new Date(l.executed_at).toDateString() === new Date().toDateString()).length ||
                0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-slate-500 mb-1">Total Actions</div>
            <div className="text-3xl font-bold">{logs?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Rules List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Rules</CardTitle>
              <CardDescription>Configure automated responses to market changes</CardDescription>
            </CardHeader>
            <CardContent>
              {!rules || rules.length === 0 ? (
                <div className="text-center py-12">
                  <Zap className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No rules yet</h3>
                  <p className="text-slate-500 mb-4">
                    Create your first autopilot rule to start automating your pricing
                  </p>
                  <Link href="/autopilot/new">
                    <Button>Create First Rule</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule: any) => (
                    <div
                      key={rule.id}
                      className={`p-4 border rounded-lg ${rule.is_active ? "bg-white dark:bg-slate-950" : "bg-slate-50 dark:bg-slate-900 opacity-60"}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getTriggerIcon(rule.trigger_type)}
                          <div>
                            <div className="font-semibold">{rule.name}</div>
                            <div className="text-sm text-slate-500">{hotelMap.get(rule.hotel_id) || "All Hotels"}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getActionBadge(rule.action_type)}
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Active" : "Paused"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-500">Trigger:</span>
                          <div className="font-medium">{rule.trigger_type.replace(/_/g, " ")}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Min Price:</span>
                          <div className="font-medium">${rule.min_price || "No limit"}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Max Price:</span>
                          <div className="font-medium">${rule.max_price || "No limit"}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Priority:</span>
                          <div className="font-medium">{rule.priority}</div>
                        </div>
                      </div>

                      {(rule.target_revenue || rule.target_occupancy) && (
                        <div className="mt-3 pt-3 border-t flex gap-4">
                          {rule.target_revenue && (
                            <div className="flex items-center gap-1 text-sm">
                              <DollarSign className="h-4 w-4 text-green-500" />
                              Target: ${rule.target_revenue.toLocaleString()}
                            </div>
                          )}
                          {rule.target_occupancy && (
                            <div className="flex items-center gap-1 text-sm">
                              <Target className="h-4 w-4 text-blue-500" />
                              Occupancy: {rule.target_occupancy}%
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end mt-3">
                        <Link href={`/autopilot/${rule.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Settings className="h-4 w-4" />
                            Configure
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!logs || logs.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No actions yet</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {logs.map((log: any) => (
                    <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-sm">{log.action_taken}</div>
                        {log.old_price && log.new_price && (
                          <div className="text-sm">
                            <span className="text-slate-400">${log.old_price}</span>
                            <span className="mx-1">→</span>
                            <span className={log.new_price > log.old_price ? "text-green-600" : "text-red-600"}>
                              ${log.new_price}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {hotelMap.get(log.hotel_id) || "Unknown Hotel"} • {new Date(log.executed_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
