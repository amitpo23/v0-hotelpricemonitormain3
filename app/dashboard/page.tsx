import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  TrendingUpIcon,
  DollarSignIcon,
  ZapIcon,
  AlertTriangleIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  BarChartIcon,
  BuildingIcon,
  BrainIcon,
  GaugeIcon,
  ClockIcon,
  CheckCircleIcon,
  BotIcon,
  TargetIcon,
  CalendarIcon,
  UsersIcon,
} from "@/components/icons"
import { DashboardCharts } from "./dashboard-charts"

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [
    { data: hotels },
    { data: scanResults },
    { data: dailyPrices },
    { data: predictions },
    { data: autopilotRules },
    { data: autopilotLogs },
    { data: trends },
    { data: alerts },
    { data: revenue },
    { data: budgets },
    { data: competitors },
    { data: competitorPrices },
  ] = await Promise.all([
    supabase.from("hotels").select("*"),
    supabase.from("scan_results").select("*").order("scraped_at", { ascending: false }).limit(100),
    supabase
      .from("daily_prices")
      .select("*")
      .gte("date", now.toISOString().split("T")[0])
      .order("date", { ascending: true }),
    supabase.from("price_predictions").select("*").order("prediction_date", { ascending: true }).limit(30),
    supabase.from("autopilot_rules").select("*").eq("is_active", true),
    supabase.from("autopilot_logs").select("*").order("executed_at", { ascending: false }).limit(10),
    supabase.from("market_trends").select("*").order("detected_at", { ascending: false }).limit(10),
    supabase.from("pricing_alerts").select("*").eq("is_read", false).order("created_at", { ascending: false }),
    supabase.from("revenue_tracking").select("*").order("date", { ascending: false }).limit(30),
    supabase.from("revenue_budgets").select("*").eq("year", currentYear).eq("month", currentMonth),
    supabase.from("hotel_competitors").select("*").eq("is_active", true),
    supabase
      .from("competitor_daily_prices")
      .select("*")
      .gte("date", now.toISOString().split("T")[0])
      .order("date", { ascending: true }),
  ])

  // Calculate statistics
  const totalHotels = hotels?.length || 0
  const activeRules = autopilotRules?.length || 0
  const unreadAlerts = alerts?.length || 0
  const totalCompetitors = competitors?.length || 0

  const avgOurPrice =
    dailyPrices && dailyPrices.length > 0
      ? dailyPrices.reduce((sum: number, d: any) => sum + Number(d.our_price || 0), 0) /
        dailyPrices.filter((d: any) => d.our_price).length
      : 0

  const avgCompetitorPrice =
    dailyPrices && dailyPrices.length > 0
      ? dailyPrices.reduce((sum: number, d: any) => sum + Number(d.avg_competitor_price || 0), 0) /
        dailyPrices.filter((d: any) => d.avg_competitor_price).length
      : 0

  const avgMarketPrice =
    avgCompetitorPrice ||
    (scanResults && scanResults.length > 0
      ? scanResults.reduce((sum: number, r: any) => sum + Number(r.price), 0) / scanResults.length
      : 0)

  const currentBudget = budgets && budgets.length > 0 ? budgets[0] : null
  const targetRevenue = currentBudget?.target_revenue || 0
  const targetOccupancy = currentBudget?.target_occupancy || 0
  const targetADR = currentBudget?.target_adr || 0

  // Calculate actual revenue this month
  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const actualRevenue =
    revenue?.reduce((sum: number, r: any) => {
      const rDate = new Date(r.date)
      if (rDate >= monthStart) {
        return sum + Number(r.revenue || 0)
      }
      return sum
    }, 0) || 0

  const budgetProgress = targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0
  const budgetGap = targetRevenue - actualRevenue

  // Occupancy calculation
  const avgOccupancy =
    revenue && revenue.length > 0
      ? revenue.reduce((sum: number, r: any) => sum + Number(r.occupancy_rate || 0), 0) / revenue.length
      : 0

  // Price trend from daily_prices
  const priceTrend =
    avgOurPrice > 0 && avgCompetitorPrice > 0 ? ((avgOurPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100 : 0

  // Days scanned
  const daysWithData = dailyPrices?.length || 0

  // Last scan time
  const lastScan =
    dailyPrices && dailyPrices.length > 0 ? new Date(dailyPrices[0].updated_at || dailyPrices[0].created_at) : null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20">
              <GaugeIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Command Center</h1>
          </div>
          <p className="text-slate-400">Real-time revenue intelligence and autopilot status</p>
        </div>
        <div className="flex gap-3">
          <Link href="/calendar">
            <Button
              variant="outline"
              className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              <CalendarIcon className="h-4 w-4" />
              Price Calendar
            </Button>
          </Link>
          <Link href="/predictions">
            <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <BrainIcon className="h-4 w-4" />
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
              <span className="text-slate-400">{daysWithData} days scanned</span>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-slate-400">{totalCompetitors} competitors tracked</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ClockIcon className="h-4 w-4" />
              <span className="text-sm">Last scan: {lastScan ? lastScan.toLocaleString() : "Never"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentBudget && (
        <Card className="mb-8 bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-white">
              <TargetIcon className="h-5 w-5 text-cyan-400" />
              Budget Progress -{" "}
              {new Date(currentYear, currentMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-slate-400 mb-1">Target Revenue</div>
                <div className="text-2xl font-bold text-white">${targetRevenue.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Actual Revenue</div>
                <div className="text-2xl font-bold text-green-400">${actualRevenue.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Gap to Target</div>
                <div className={`text-2xl font-bold ${budgetGap > 0 ? "text-red-400" : "text-green-400"}`}>
                  {budgetGap > 0 ? "-" : "+"}${Math.abs(budgetGap).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-1">Progress</div>
                <div className="text-2xl font-bold text-cyan-400">{budgetProgress.toFixed(1)}%</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Monthly Progress</span>
                <span className="text-slate-400">{budgetProgress.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetProgress >= 100
                      ? "bg-green-500"
                      : budgetProgress >= 75
                        ? "bg-cyan-500"
                        : budgetProgress >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="text-slate-500">Target Occupancy: {targetOccupancy}%</span>
                <span className="text-slate-500">Target ADR: ${targetADR}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics - Updated with more data */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard
          icon={<BuildingIcon className="h-4 w-4" />}
          label="Properties"
          value={totalHotels.toString()}
          color="cyan"
        />
        <MetricCard
          icon={<DollarSignIcon className="h-4 w-4" />}
          label="Our Avg Price"
          value={avgOurPrice > 0 ? `$${avgOurPrice.toFixed(0)}` : "N/A"}
          trend={priceTrend}
          color="green"
        />
        <MetricCard
          icon={<UsersIcon className="h-4 w-4" />}
          label="Competitor Avg"
          value={avgCompetitorPrice > 0 ? `$${avgCompetitorPrice.toFixed(0)}` : "N/A"}
          color="yellow"
        />
        <MetricCard
          icon={<ZapIcon className="h-4 w-4" />}
          label="Active Rules"
          value={activeRules.toString()}
          color="purple"
        />
        <MetricCard
          icon={<BarChartIcon className="h-4 w-4" />}
          label="Avg Occupancy"
          value={`${avgOccupancy.toFixed(0)}%`}
          color="blue"
        />
        <MetricCard
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          label="Alerts"
          value={unreadAlerts.toString()}
          color={unreadAlerts > 0 ? "red" : "slate"}
          alert={unreadAlerts > 0}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSignIcon className="h-5 w-5 text-green-400" />
              Price Position vs Competitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {avgOurPrice > 0 && avgCompetitorPrice > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-400">Your Average Price</div>
                    <div className="text-3xl font-bold text-white">${avgOurPrice.toFixed(0)}</div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${priceTrend > 0 ? "text-red-400" : priceTrend < 0 ? "text-green-400" : "text-slate-400"}`}
                    >
                      {priceTrend > 0 ? "+" : ""}
                      {priceTrend.toFixed(1)}%
                    </div>
                    <div className="text-sm text-slate-500">vs competitors</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Competitor Average</div>
                    <div className="text-3xl font-bold text-slate-300">${avgCompetitorPrice.toFixed(0)}</div>
                  </div>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${priceTrend > 5 ? "bg-red-500" : priceTrend < -5 ? "bg-green-500" : "bg-cyan-500"}`}
                    style={{
                      width: `${Math.min(Math.max((avgOurPrice / (avgCompetitorPrice * 1.5)) * 100, 10), 100)}%`,
                    }}
                  />
                </div>
                <div className="text-sm text-slate-500">
                  {priceTrend > 5
                    ? "You're priced above the market - consider adjusting"
                    : priceTrend < -5
                      ? "You're priced below market - opportunity to increase"
                      : "Your pricing is competitive with the market"}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <DollarSignIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No price data yet</p>
                <Link href="/calendar">
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500">
                    Run Scan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue vs Budget */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TargetIcon className="h-5 w-5 text-cyan-400" />
              Revenue vs Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentBudget ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">This Month</div>
                    <div className="text-2xl font-bold text-green-400">${actualRevenue.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">of ${targetRevenue.toLocaleString()} target</div>
                  </div>
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Days Remaining</div>
                    <div className="text-2xl font-bold text-white">
                      {new Date(currentYear, currentMonth, 0).getDate() - now.getDate()}
                    </div>
                    <div className="text-xs text-slate-500">in this month</div>
                  </div>
                </div>
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-slate-400">Daily Target to Reach Goal</div>
                      <div className="text-xl font-bold text-cyan-400">
                        $
                        {budgetGap > 0
                          ? (
                              budgetGap / Math.max(new Date(currentYear, currentMonth, 0).getDate() - now.getDate(), 1)
                            ).toFixed(0)
                          : "0"}
                        /day
                      </div>
                    </div>
                    <Badge
                      className={
                        budgetProgress >= 100 ? "bg-green-500" : budgetProgress >= 75 ? "bg-cyan-500" : "bg-yellow-500"
                      }
                    >
                      {budgetProgress >= 100 ? "On Track" : budgetProgress >= 75 ? "Close" : "Behind"}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TargetIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No budget set for this month</p>
                <Link href="/budget">
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500">
                    Set Budget
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts - Pass daily prices data */}
      <DashboardCharts
        scanResults={scanResults || []}
        predictions={predictions || []}
        revenue={revenue || []}
        dailyPrices={dailyPrices || []}
      />

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        {/* Autopilot Activity */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ZapIcon className="h-5 w-5 text-yellow-400" />
              Autopilot Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!autopilotLogs || autopilotLogs.length === 0 ? (
              <div className="text-center py-8">
                <BotIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
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
                      <CheckCircleIcon className="h-4 w-4 text-green-400" />
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

        {/* Upcoming High Demand Days */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUpIcon className="h-5 w-5 text-green-400" />
              High Demand Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPrices &&
            dailyPrices.filter((d: any) => d.demand_level === "high" || d.demand_level === "peak").length > 0 ? (
              <div className="space-y-3">
                {dailyPrices
                  .filter((d: any) => d.demand_level === "high" || d.demand_level === "peak")
                  .slice(0, 5)
                  .map((day: any) => (
                    <div
                      key={day.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                    >
                      <div>
                        <div className="font-medium text-sm text-white">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <Badge className={day.demand_level === "peak" ? "bg-red-500" : "bg-orange-500"}>
                          {day.demand_level} demand
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">${day.our_price || day.recommended_price}</div>
                        <div className="text-xs text-slate-500">rec: ${day.recommended_price}</div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No high demand days detected</p>
                <Link href="/calendar">
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                    View Calendar
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competitors Summary */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UsersIcon className="h-5 w-5 text-purple-400" />
              Competitors Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            {competitors && competitors.length > 0 ? (
              <div className="space-y-3">
                {competitors.slice(0, 5).map((comp: any) => {
                  const compPrices = competitorPrices?.filter((p: any) => p.competitor_id === comp.id) || []
                  const avgPrice =
                    compPrices.length > 0
                      ? compPrices.reduce((s: number, p: any) => s + Number(p.price), 0) / compPrices.length
                      : 0
                  return (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                    >
                      <div>
                        <div className="font-medium text-sm text-white">{comp.competitor_hotel_name}</div>
                        <div className="text-xs text-slate-500">
                          {"⭐".repeat(comp.star_rating || 0)} {comp.star_rating ? `${comp.star_rating} stars` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        {avgPrice > 0 ? (
                          <>
                            <div className="text-lg font-bold text-white">${avgPrice.toFixed(0)}</div>
                            <div className="text-xs text-slate-500">avg price</div>
                          </>
                        ) : (
                          <span className="text-slate-500 text-sm">No data</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                <Link href="/competitors">
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-slate-300 bg-transparent">
                    Manage Competitors
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No competitors configured</p>
                <Link href="/competitors/add">
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500">
                    Add Competitors
                  </Button>
                </Link>
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
        {typeof trend === "number" && trend !== 0 && (
          <div className={`flex items-center text-sm ${trend >= 0 ? "text-red-400" : "text-green-400"}`}>
            {trend >= 0 ? <ArrowUpRightIcon className="h-3 w-3" /> : <ArrowDownRightIcon className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% vs market
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
