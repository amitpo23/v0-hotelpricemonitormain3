import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Building2,
  Radar,
  Brain,
  Gauge,
  Clock,
  CheckCircle2,
  Bot,
  LineChart,
} from "lucide-react"
import { DashboardCharts } from "./dashboard-charts"

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch all data in parallel
  const [
    { data: hotels },
    { data: scanResults },
    { data: predictions },
    { data: autopilotRules },
    { data: autopilotLogs },
    { data: trends },
    { data: alerts },
    { data: revenue },
  ] = await Promise.all([
    supabase.from("hotels").select("*"),
    supabase.from("scan_results").select("*").order("scraped_at", { ascending: false }).limit(100),
    supabase.from("price_predictions").select("*").order("prediction_date", { ascending: true }).limit(30),
    supabase.from("autopilot_rules").select("*").eq("is_active", true),
    supabase.from("autopilot_logs").select("*").order("executed_at", { ascending: false }).limit(10),
    supabase.from("market_trends").select("*").order("detected_at", { ascending: false }).limit(10),
    supabase.from("pricing_alerts").select("*").eq("is_read", false).order("created_at", { ascending: false }),
    supabase.from("revenue_tracking").select("*").order("date", { ascending: false }).limit(30),
  ])

  // Calculate statistics
  const totalHotels = hotels?.length || 0
  const activeRules = autopilotRules?.length || 0
  const unreadAlerts = alerts?.length || 0

  // Calculate average market price
  const avgMarketPrice =
    scanResults && scanResults.length > 0
      ? scanResults.reduce((sum: number, r: any) => sum + Number(r.price), 0) / scanResults.length
      : 0

  // Calculate revenue stats
  const totalRevenue = revenue?.reduce((sum: number, r: any) => sum + Number(r.revenue || 0), 0) || 0
  const avgOccupancy =
    revenue && revenue.length > 0
      ? revenue.reduce((sum: number, r: any) => sum + Number(r.occupancy_rate || 0), 0) / revenue.length
      : 0

  // Price trend
  const recentPrices = scanResults?.slice(0, 50) || []
  const olderPrices = scanResults?.slice(50, 100) || []
  const recentAvg =
    recentPrices.length > 0
      ? recentPrices.reduce((s: number, r: any) => s + Number(r.price), 0) / recentPrices.length
      : 0
  const olderAvg =
    olderPrices.length > 0
      ? olderPrices.reduce((s: number, r: any) => s + Number(r.price), 0) / olderPrices.length
      : recentAvg
  const priceTrend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20">
              <Gauge className="h-6 w-6 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Command Center</h1>
          </div>
          <p className="text-slate-400">Real-time revenue intelligence and autopilot status</p>
        </div>
        <div className="flex gap-3">
          <Link href="/autopilot/new">
            <Button
              variant="outline"
              className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              <Zap className="h-4 w-4" />
              New Rule
            </Button>
          </Link>
          <Link href="/predictions">
            <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <Brain className="h-4 w-4" />
              Generate Predictions
            </Button>
          </Link>
        </div>
      </div>

      {/* Autopilot Status Banner */}
      <Card className="mb-8 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-cyan-500/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 font-medium">Autopilot Active</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-slate-400">{activeRules} rules running</span>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-slate-400">{autopilotLogs?.length || 0} actions today</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Last scan: 2 min ago</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard
          icon={<Building2 className="h-4 w-4" />}
          label="Properties"
          value={totalHotels.toString()}
          color="cyan"
        />
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Avg Market Price"
          value={`$${avgMarketPrice.toFixed(0)}`}
          trend={priceTrend}
          color="green"
        />
        <MetricCard
          icon={<Zap className="h-4 w-4" />}
          label="Active Rules"
          value={activeRules.toString()}
          color="yellow"
        />
        <MetricCard
          icon={<Activity className="h-4 w-4" />}
          label="Auto Actions"
          value={(autopilotLogs?.length || 0).toString()}
          color="blue"
        />
        <MetricCard
          icon={<BarChart3 className="h-4 w-4" />}
          label="Avg Occupancy"
          value={`${avgOccupancy.toFixed(0)}%`}
          color="purple"
        />
        <MetricCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Alerts"
          value={unreadAlerts.toString()}
          color={unreadAlerts > 0 ? "red" : "slate"}
          alert={unreadAlerts > 0}
        />
      </div>

      {/* Charts */}
      <DashboardCharts scanResults={scanResults || []} predictions={predictions || []} revenue={revenue || []} />

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        {/* Autopilot Activity */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-yellow-400" />
              Autopilot Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!autopilotLogs || autopilotLogs.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No actions yet</p>
                <Link href="/autopilot/new">
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                    Create First Rule
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {autopilotLogs.slice(0, 5).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <div>
                        <div className="font-medium text-sm text-white">{log.action_taken}</div>
                        <div className="text-xs text-slate-500">{new Date(log.executed_at).toLocaleString()}</div>
                      </div>
                    </div>
                    {log.old_price && log.new_price && (
                      <div className="text-right">
                        <span className="text-slate-500">${log.old_price}</span>
                        <span className="mx-1 text-slate-600">→</span>
                        <span className="font-bold text-green-400">${log.new_price}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Intelligence */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Radar className="h-5 w-5 text-blue-400" />
              Market Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!trends || trends.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No trends detected</p>
                <Link href="/trends">
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                    Analyze Trends
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {trends.slice(0, 5).map((trend: any) => (
                  <div
                    key={trend.id}
                    className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                  >
                    {trend.trend_type === "price_increase" ? (
                      <TrendingUp className="h-5 w-5 text-green-400" />
                    ) : trend.trend_type === "price_decrease" ? (
                      <TrendingDown className="h-5 w-5 text-red-400" />
                    ) : (
                      <Activity className="h-5 w-5 text-blue-400" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sm text-white">{trend.description || trend.trend_type}</div>
                      <div className="text-xs text-slate-500">
                        {trend.percentage_change &&
                          `${trend.percentage_change > 0 ? "+" : ""}${trend.percentage_change}%`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Predictions */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Brain className="h-5 w-5 text-purple-400" />
              AI Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!predictions || predictions.length === 0 ? (
              <div className="text-center py-8">
                <LineChart className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No predictions yet</p>
                <Link href="/predictions">
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500">
                    Generate Now
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {predictions.slice(0, 5).map((pred: any) => (
                  <div
                    key={pred.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                  >
                    <div>
                      <div className="font-medium text-sm text-white">
                        {new Date(pred.prediction_date).toLocaleDateString()}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          pred.predicted_demand === "very_high"
                            ? "border-red-500/50 text-red-400"
                            : pred.predicted_demand === "high"
                              ? "border-orange-500/50 text-orange-400"
                              : pred.predicted_demand === "medium"
                                ? "border-yellow-500/50 text-yellow-400"
                                : "border-slate-500/50 text-slate-400"
                        }`}
                      >
                        {pred.predicted_demand || "medium"} demand
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">${pred.predicted_price}</div>
                      {pred.confidence_score && (
                        <div className="text-xs text-slate-500">{(pred.confidence_score * 100).toFixed(0)}% conf</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  trend,
  color,
  alert,
}: {
  icon: React.ReactNode
  label: string
  value: string
  trend?: number
  color: string
  alert?: boolean
}) {
  const colorClasses: Record<string, string> = {
    cyan: "text-cyan-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    red: "text-red-400",
    slate: "text-slate-400",
  }

  return (
    <Card className={`bg-slate-900/50 border-slate-800 ${alert ? "border-red-500/50" : ""}`}>
      <CardContent className="pt-6">
        <div className={`flex items-center gap-2 ${colorClasses[color]} mb-1`}>
          {icon}
          <span className="text-sm text-slate-500">{label}</span>
        </div>
        <div className="text-3xl font-bold text-white">{value}</div>
        {typeof trend === "number" && (
          <div className={`flex items-center text-sm ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
        {alert && (
          <Badge variant="destructive" className="mt-1">
            Action needed
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}
