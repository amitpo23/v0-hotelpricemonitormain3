import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  MapPin,
  DollarSign,
  TrendingUp,
  BarChart3,
  Bot,
  Target,
  Activity,
  Users,
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DeleteHotelButton } from "./delete-button"
import { HotelPriceChart } from "./hotel-price-chart"
import { HotelCompetitorTable } from "./hotel-competitor-table"

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: hotel, error } = await supabase.from("hotels").select("*").eq("id", id).single()

  if (error || !hotel) {
    notFound()
  }

  // Fetch all related data in parallel
  const [
    { data: scanResults },
    { data: recommendations },
    { data: alerts },
    { data: predictions },
    { data: autopilotRules },
    { data: autopilotLogs },
    { data: competitorData },
    { data: revenue },
    { data: historicalPerformance },
    { data: optimizationHistory },
  ] = await Promise.all([
    supabase.from("scan_results").select("*").eq("hotel_id", id).order("scraped_at", { ascending: false }).limit(100),
    supabase
      .from("price_recommendations")
      .select("*")
      .eq("hotel_id", id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("pricing_alerts")
      .select("*")
      .eq("hotel_id", id)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("price_predictions")
      .select("*")
      .eq("hotel_id", id)
      .order("prediction_date", { ascending: true })
      .limit(30),
    supabase.from("autopilot_rules").select("*").eq("hotel_id", id).order("priority", { ascending: true }),
    supabase.from("autopilot_logs").select("*").eq("hotel_id", id).order("executed_at", { ascending: false }).limit(20),
    supabase.from("competitor_data").select("*").eq("hotel_id", id).order("scraped_at", { ascending: false }).limit(50),
    supabase.from("revenue_tracking").select("*").eq("hotel_id", id).order("date", { ascending: false }).limit(30),
    supabase
      .from("historical_performance")
      .select("*")
      .eq("hotel_id", id)
      .order("period_end", { ascending: false })
      .limit(6),
    supabase
      .from("price_optimization_history")
      .select("*")
      .eq("hotel_id", id)
      .order("date", { ascending: false })
      .limit(20),
  ])

  // Calculate KPIs
  const avgScanPrice =
    scanResults && scanResults.length > 0
      ? scanResults.reduce((sum: number, r: any) => sum + Number(r.price), 0) / scanResults.length
      : 0

  const avgCompetitorPrice =
    competitorData && competitorData.length > 0
      ? competitorData.reduce((sum: number, c: any) => sum + Number(c.price), 0) / competitorData.length
      : 0

  const pricePosition =
    avgCompetitorPrice > 0 ? ((Number(hotel.base_price || 0) - avgCompetitorPrice) / avgCompetitorPrice) * 100 : 0

  const totalRevenue = revenue?.reduce((sum: number, r: any) => sum + Number(r.revenue || 0), 0) || 0
  const avgOccupancy =
    revenue && revenue.length > 0
      ? revenue.reduce((sum: number, r: any) => sum + Number(r.occupancy_rate || 0), 0) / revenue.length
      : 0

  const revpar = avgOccupancy > 0 ? (Number(hotel.base_price || 0) * avgOccupancy) / 100 : 0

  const activeRules = autopilotRules?.filter((r: any) => r.is_active).length || 0

  // Price trend calculation
  const recentScans = scanResults?.slice(0, 20) || []
  const olderScans = scanResults?.slice(20, 40) || []
  const recentAvg =
    recentScans.length > 0 ? recentScans.reduce((s: number, r: any) => s + Number(r.price), 0) / recentScans.length : 0
  const olderAvg =
    olderScans.length > 0
      ? olderScans.reduce((s: number, r: any) => s + Number(r.price), 0) / olderScans.length
      : recentAvg
  const priceTrend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/hotels">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hotels
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">{hotel.name}</h1>
          {hotel.location && (
            <p className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {hotel.location}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/hotels/${id}/edit`}>
            <Button variant="outline">Edit Hotel</Button>
          </Link>
          <DeleteHotelButton hotelId={id} hotelName={hotel.name} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              <span className="text-xs">Base Price</span>
            </div>
            <div className="text-xl font-bold">${hotel.base_price || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <BarChart3 className="h-3 w-3" />
              <span className="text-xs">Market Avg</span>
            </div>
            <div className="text-xl font-bold">${avgCompetitorPrice.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Target className="h-3 w-3" />
              <span className="text-xs">Position</span>
            </div>
            <div className={`text-xl font-bold ${pricePosition >= 0 ? "text-amber-600" : "text-green-600"}`}>
              {pricePosition >= 0 ? "+" : ""}
              {pricePosition.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Trend</span>
            </div>
            <div
              className={`text-xl font-bold flex items-center ${priceTrend >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {priceTrend >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(priceTrend).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Activity className="h-3 w-3" />
              <span className="text-xs">Occupancy</span>
            </div>
            <div className="text-xl font-bold">{avgOccupancy.toFixed(0)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <BarChart3 className="h-3 w-3" />
              <span className="text-xs">RevPAR</span>
            </div>
            <div className="text-xl font-bold">${revpar.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              <span className="text-xs">Competitors</span>
            </div>
            <div className="text-xl font-bold">
              {competitorData ? new Set(competitorData.map((c: any) => c.competitor_name)).size : 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-muted-foreground mb-1">
              <Bot className="h-3 w-3" />
              <span className="text-xs">Auto Rules</span>
            </div>
            <div className="text-xl font-bold">{activeRules}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="autopilot">Autopilot</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Price Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Price History</CardTitle>
                <CardDescription>Your prices vs competitor average over time</CardDescription>
              </CardHeader>
              <CardContent>
                <HotelPriceChart
                  scanResults={scanResults || []}
                  competitorData={competitorData || []}
                  basePrice={Number(hotel.base_price || 0)}
                />
              </CardContent>
            </Card>

            {/* Recommendation Card */}
            <div className="space-y-6">
              {recommendations && recommendations.length > 0 && (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <TrendingUp className="h-5 w-5" />
                      Recommended Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-green-700 dark:text-green-400">
                      ${recommendations[0].recommended_price}
                    </div>
                    {recommendations[0].confidence_score && (
                      <Badge variant="outline" className="mt-2">
                        {(recommendations[0].confidence_score * 100).toFixed(0)}% confidence
                      </Badge>
                    )}
                    {recommendations[0].reasoning && (
                      <p className="mt-3 text-sm text-muted-foreground">{recommendations[0].reasoning}</p>
                    )}
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Current</div>
                        <div className="font-bold">${hotel.base_price || 0}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Difference</div>
                        <div
                          className={`font-bold ${Number(recommendations[0].recommended_price) > Number(hotel.base_price || 0) ? "text-green-600" : "text-red-600"}`}
                        >
                          {Number(recommendations[0].recommended_price) > Number(hotel.base_price || 0) ? "+" : ""}$
                          {(Number(recommendations[0].recommended_price) - Number(hotel.base_price || 0)).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Alerts */}
              {alerts && alerts.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-orange-600">Active Alerts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {alerts.slice(0, 3).map((alert: any) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-lg text-sm ${
                          alert.severity === "warning"
                            ? "bg-orange-50 dark:bg-orange-950/30"
                            : alert.severity === "error"
                              ? "bg-red-50 dark:bg-red-950/30"
                              : "bg-blue-50 dark:bg-blue-950/30"
                        }`}
                      >
                        <Badge variant="outline" className="mb-1 text-xs">
                          {alert.alert_type}
                        </Badge>
                        <p>{alert.message}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Link href={`/scans/new?hotel=${id}`} className="block">
                    <Button className="w-full">New Scan</Button>
                  </Link>
                  <Link href={`/autopilot/new?hotel=${id}`} className="block">
                    <Button variant="outline" className="w-full bg-transparent">
                      Add Autopilot Rule
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Scans */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Scan Results</CardTitle>
              <CardDescription>Latest prices from competitor scans</CardDescription>
            </CardHeader>
            <CardContent>
              {!scanResults || scanResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No scan results yet</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scanResults.slice(0, 9).map((result: any) => (
                    <div key={result.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium">{result.source}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(result.scraped_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">${result.price}</div>
                        <Badge variant={result.availability ? "default" : "secondary"} className="text-xs">
                          {result.availability ? "Available" : "Unavailable"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competitors Tab */}
        <TabsContent value="competitors" className="space-y-6">
          <HotelCompetitorTable competitorData={competitorData || []} hotelBasePrice={Number(hotel.base_price || 0)} />
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Price Predictions
              </CardTitle>
              <CardDescription>AI-generated price forecasts for the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {predictions && predictions.length > 0 ? (
                <div className="space-y-3">
                  {predictions.map((pred: any) => (
                    <div key={pred.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div>
                        <div className="font-medium">
                          {new Date(pred.prediction_date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <Badge
                          variant={
                            pred.predicted_demand === "very_high"
                              ? "destructive"
                              : pred.predicted_demand === "high"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {pred.predicted_demand || "medium"} demand
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">${pred.predicted_price}</div>
                        {pred.confidence_score && (
                          <div className="text-xs text-muted-foreground">
                            {(pred.confidence_score * 100).toFixed(0)}% confidence
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Predictions Yet</h3>
                  <p className="text-muted-foreground mb-4">Generate AI-powered price predictions</p>
                  <Link href="/predictions">
                    <Button>Generate Predictions</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Autopilot Tab */}
        <TabsContent value="autopilot" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Autopilot Rules
                  </CardTitle>
                  <Link href={`/autopilot/new?hotel=${id}`}>
                    <Button size="sm">Add Rule</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {autopilotRules && autopilotRules.length > 0 ? (
                  <div className="space-y-3">
                    {autopilotRules.map((rule: any) => (
                      <div key={rule.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{rule.name}</div>
                          <Badge variant={rule.is_active ? "default" : "secondary"}>
                            {rule.is_active ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Trigger: </span>
                            <span className="font-medium">{rule.trigger_type.replace("_", " ")}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Action: </span>
                            <span className="font-medium">{rule.action_type.replace("_", " ")}</span>
                          </div>
                        </div>
                        {(rule.min_price || rule.max_price) && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Price range: ${rule.min_price || "0"} - ${rule.max_price || "∞"}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No autopilot rules configured</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Recent Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {autopilotLogs && autopilotLogs.length > 0 ? (
                  <div className="space-y-3">
                    {autopilotLogs.slice(0, 8).map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <div className="font-medium text-sm">{log.action_taken}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.executed_at).toLocaleString()}
                          </div>
                        </div>
                        {log.old_price && log.new_price && (
                          <div className="text-right">
                            <span className="text-muted-foreground">${log.old_price}</span>
                            <span className="mx-1">→</span>
                            <span className="font-bold text-green-600">${log.new_price}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No autopilot actions yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Revenue (30d)</div>
                <div className="text-3xl font-bold">${totalRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Avg Occupancy</div>
                <div className="text-3xl font-bold">{avgOccupancy.toFixed(0)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">RevPAR</div>
                <div className="text-3xl font-bold">${revpar.toFixed(0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Scans</div>
                <div className="text-3xl font-bold">{scanResults?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historical Performance</CardTitle>
              <CardDescription>Monthly performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {historicalPerformance && historicalPerformance.length > 0 ? (
                <div className="space-y-3">
                  {historicalPerformance.map((perf: any) => (
                    <div key={perf.id} className="grid grid-cols-6 gap-4 p-3 rounded-lg bg-muted/50 items-center">
                      <div>
                        <div className="text-xs text-muted-foreground">Period</div>
                        <div className="font-medium text-sm">
                          {new Date(perf.period_start).toLocaleDateString()} -{" "}
                          {new Date(perf.period_end).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                        <div className="font-bold">${Number(perf.total_revenue || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Bookings</div>
                        <div className="font-bold">{perf.total_bookings || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">ADR</div>
                        <div className="font-bold">${Number(perf.avg_daily_rate || 0).toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">RevPAR</div>
                        <div className="font-bold">${Number(perf.revpar || 0).toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Occupancy</div>
                        <div className="font-bold">{Number(perf.occupancy_rate || 0).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No historical performance data</p>
              )}
            </CardContent>
          </Card>

          {/* Optimization History */}
          <Card>
            <CardHeader>
              <CardTitle>Price Optimization History</CardTitle>
            </CardHeader>
            <CardContent>
              {optimizationHistory && optimizationHistory.length > 0 ? (
                <div className="space-y-3">
                  {optimizationHistory.slice(0, 10).map((opt: any) => (
                    <div key={opt.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <div className="font-medium">{new Date(opt.date).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {opt.optimization_reason || "Automated optimization"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-muted-foreground">${Number(opt.original_price || 0).toFixed(0)}</span>
                          <span className="mx-2">→</span>
                          <span className="font-bold">${Number(opt.optimized_price || 0).toFixed(0)}</span>
                        </div>
                        <Badge variant={Number(opt.performance_score || 0) >= 0.7 ? "default" : "secondary"}>
                          {(Number(opt.performance_score || 0) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No optimization history</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
