import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import {
  TrendingUpIcon,
  DollarSignIcon,
  MapPinIcon,
  UsersIcon,
  CalendarIcon,
  TargetIcon,
  BarChart3Icon,
  PieChartIcon,
  ActivityIcon,
  GlobeIcon,
  Building2Icon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  SparklesIcon,
  ClockIcon,
} from "@/components/icons"
import { AnalyticsCharts } from "./analytics-charts"
import { MarketIntelligencePanel } from "./market-intelligence-panel"
import { RefreshDataButton } from "./refresh-data-button"

export default async function AnalyticsPage() {
  const supabase = await createClient()

  // Fetch all data in parallel
  const [
    { data: hotels },
    { data: scanResults },
    { data: competitorData },
    { data: regionalData },
    { data: predictions },
    { data: historicalPerformance },
    { data: demandFactors },
    { data: optimizationHistory },
    { data: revenue },
    { data: trends },
  ] = await Promise.all([
    supabase.from("hotels").select("*"),
    supabase.from("scan_results").select("*").order("scraped_at", { ascending: false }).limit(500),
    supabase.from("competitor_data").select("*").order("scraped_at", { ascending: false }).limit(200),
    supabase.from("regional_market_data").select("*").order("date", { ascending: false }).limit(90),
    supabase.from("price_predictions").select("*").order("prediction_date", { ascending: true }).limit(60),
    supabase.from("historical_performance").select("*").order("period_end", { ascending: false }).limit(12),
    supabase.from("demand_factors").select("*").order("date", { ascending: false }).limit(30),
    supabase.from("price_optimization_history").select("*").order("date", { ascending: false }).limit(30),
    supabase.from("revenue_tracking").select("*").order("date", { ascending: false }).limit(90),
    supabase.from("market_trends").select("*").order("detected_at", { ascending: false }).limit(20),
  ])

  // Calculate KPIs
  const totalHotels = hotels?.length || 0
  const totalScans = scanResults?.length || 0

  // Average market price from scan results
  const avgMarketPrice =
    scanResults && scanResults.length > 0
      ? scanResults.reduce((sum: number, r: any) => sum + Number(r.price), 0) / scanResults.length
      : 0

  // Competitor analysis
  const competitorCount = competitorData ? new Set(competitorData.map((c: any) => c.competitor_name)).size : 0
  const avgCompetitorPrice =
    competitorData && competitorData.length > 0
      ? competitorData.reduce((sum: number, c: any) => sum + Number(c.price), 0) / competitorData.length
      : 0
  const avgCompetitorRating =
    competitorData && competitorData.length > 0
      ? competitorData.filter((c: any) => c.rating).reduce((sum: number, c: any) => sum + Number(c.rating || 0), 0) /
        competitorData.filter((c: any) => c.rating).length
      : 0

  // Regional insights
  const latestRegionalData = regionalData?.[0]
  const avgRegionalOccupancy =
    regionalData && regionalData.length > 0
      ? regionalData.reduce((sum: number, r: any) => sum + Number(r.avg_occupancy_rate || 0), 0) / regionalData.length
      : 0

  // Revenue metrics
  const totalRevenue = revenue?.reduce((sum: number, r: any) => sum + Number(r.revenue || 0), 0) || 0
  const avgRevenue = revenue && revenue.length > 0 ? totalRevenue / revenue.length : 0
  const revenueGrowth =
    revenue && revenue.length >= 2
      ? ((Number(revenue[0]?.revenue || 0) - Number(revenue[1]?.revenue || 0)) / Number(revenue[1]?.revenue || 1)) * 100
      : 0

  // Occupancy metrics
  const avgOccupancy =
    revenue && revenue.length > 0
      ? revenue.reduce((sum: number, r: any) => sum + Number(r.occupancy_rate || 0), 0) / revenue.length
      : 0

  // RevPAR calculation
  const avgRevPAR =
    historicalPerformance && historicalPerformance.length > 0
      ? historicalPerformance.reduce((sum: number, h: any) => sum + Number(h.revpar || 0), 0) /
        historicalPerformance.length
      : avgMarketPrice * (avgOccupancy / 100)

  // Price position vs market
  const hotelAvgPrice =
    hotels && hotels.length > 0
      ? hotels.reduce((sum: number, h: any) => sum + Number(h.base_price || 0), 0) / hotels.length
      : 0
  const pricePositionVsMarket =
    avgCompetitorPrice > 0 ? ((hotelAvgPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100 : 0

  // Optimization success rate
  const optimizationSuccessRate =
    optimizationHistory && optimizationHistory.length > 0
      ? (optimizationHistory.filter((o: any) => Number(o.performance_score || 0) >= 0.7).length /
          optimizationHistory.length) *
        100
      : 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <BarChart3Icon className="h-10 w-10 text-primary" />
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground">
            Market intelligence, competitor analysis, and revenue optimization insights
          </p>
        </div>
        <div className="flex gap-2">
          <RefreshDataButton />
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2 bg-transparent">
              <ActivityIcon className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Building2Icon className="h-3.5 w-3.5" />
              <span className="text-xs">Hotels</span>
            </div>
            <div className="text-2xl font-bold">{totalHotels}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <DollarSignIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Avg Price</span>
            </div>
            <div className="text-2xl font-bold">₪{avgMarketPrice.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <UsersIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Competitors</span>
            </div>
            <div className="text-2xl font-bold">{competitorCount}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <TargetIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Occupancy</span>
            </div>
            <div className="text-2xl font-bold">{avgOccupancy.toFixed(0)}%</div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <BarChart3Icon className="h-3.5 w-3.5" />
              <span className="text-xs">RevPAR</span>
            </div>
            <div className="text-2xl font-bold">₪{avgRevPAR.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <GlobeIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Market Avg</span>
            </div>
            <div className="text-2xl font-bold">₪{avgCompetitorPrice.toFixed(0)}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <TrendingUpIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Revenue</span>
            </div>
            <div className="text-2xl font-bold">₪{(totalRevenue / 1000).toFixed(0)}K</div>
            <div className={`flex items-center text-xs ${revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {revenueGrowth >= 0 ? (
                <ArrowUpRightIcon className="h-3 w-3" />
              ) : (
                <ArrowDownRightIcon className="h-3 w-3" />
              )}
              {Math.abs(revenueGrowth).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <SparklesIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Optimization</span>
            </div>
            <div className="text-2xl font-bold">{optimizationSuccessRate.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="market">Market Intel</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <AnalyticsCharts
            scanResults={scanResults || []}
            competitorData={competitorData || []}
            revenue={revenue || []}
            predictions={predictions || []}
          />

          {/* Summary Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Price Position */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TargetIcon className="h-5 w-5 text-blue-500" />
                  Price Position
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div
                    className={`text-4xl font-bold ${pricePositionVsMarket >= 0 ? "text-amber-600" : "text-green-600"}`}
                  >
                    {pricePositionVsMarket >= 0 ? "+" : ""}
                    {pricePositionVsMarket.toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {pricePositionVsMarket >= 0 ? "Above market average" : "Below market average"}
                  </p>
                  <div className="flex justify-center gap-4 mt-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Your Avg</div>
                      <div className="font-bold">₪{hotelAvgPrice.toFixed(0)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Market Avg</div>
                      <div className="font-bold">₪{avgCompetitorPrice.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Regional Demand */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-green-500" />
                  Regional Demand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <Badge
                    className="text-lg px-4 py-1"
                    variant={
                      latestRegionalData?.demand_level === "peak"
                        ? "destructive"
                        : latestRegionalData?.demand_level === "high"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {latestRegionalData?.demand_level?.toUpperCase() || "MEDIUM"} DEMAND
                  </Badge>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Regional Occupancy</div>
                      <div className="font-bold">{avgRegionalOccupancy.toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Hotels Tracked</div>
                      <div className="font-bold">{latestRegionalData?.total_hotels_tracked || 0}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Events Impact */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-purple-500" />
                  Demand Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {demandFactors && demandFactors.length > 0 ? (
                    demandFactors.slice(0, 4).map((factor: any) => (
                      <div key={factor.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {factor.factor_type}
                          </Badge>
                          <span className="text-sm font-medium truncate max-w-[120px]">{factor.factor_name}</span>
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            Number(factor.impact_score) > 0
                              ? "text-green-600"
                              : Number(factor.impact_score) < 0
                                ? "text-red-600"
                                : ""
                          }`}
                        >
                          {Number(factor.impact_score) > 0 ? "+" : ""}
                          {(Number(factor.impact_score) * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No demand factors detected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Competitors Tab */}
        <TabsContent value="competitors" className="space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Competitor Price Comparison */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="h-5 w-5" />
                  Competitor Price Comparison
                </CardTitle>
                <CardDescription>Latest prices from tracked competitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {competitorData && competitorData.length > 0 ? (
                    // Group by competitor name and show latest
                    Object.entries(
                      competitorData.reduce((acc: any, item: any) => {
                        if (
                          !acc[item.competitor_name] ||
                          new Date(item.scraped_at) > new Date(acc[item.competitor_name].scraped_at)
                        ) {
                          acc[item.competitor_name] = item
                        }
                        return acc
                      }, {}),
                    )
                      .slice(0, 8)
                      .map(([name, data]: [string, any]) => (
                        <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex-1">
                            <div className="font-medium">{name}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {data.rating && (
                                <span className="flex items-center gap-1">⭐ {Number(data.rating).toFixed(1)}</span>
                              )}
                              {data.review_count && <span>({data.review_count} reviews)</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold">₪{Number(data.price).toFixed(0)}</div>
                            <div
                              className={`text-xs ${
                                Number(data.price) > hotelAvgPrice ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {Number(data.price) > hotelAvgPrice
                                ? `₪${(Number(data.price) - hotelAvgPrice).toFixed(0)} higher`
                                : `₪${(hotelAvgPrice - Number(data.price)).toFixed(0)} lower`}
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No competitor data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Competitor Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Competitor Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold">{competitorCount}</div>
                  <div className="text-muted-foreground">Tracked Competitors</div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Price</span>
                    <span className="font-bold">₪{avgCompetitorPrice.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Rating</span>
                    <span className="font-bold">{avgCompetitorRating.toFixed(1)} ⭐</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Range</span>
                    <span className="font-bold">
                      ₪
                      {competitorData && competitorData.length > 0
                        ? Math.min(...competitorData.map((c: any) => Number(c.price))).toFixed(0)
                        : 0}{" "}
                      - ₪
                      {competitorData && competitorData.length > 0
                        ? Math.max(...competitorData.map((c: any) => Number(c.price))).toFixed(0)
                        : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Market Intelligence Tab */}
        <TabsContent value="market" className="space-y-6">
          <MarketIntelligencePanel
            regionalData={regionalData || []}
            demandFactors={demandFactors || []}
            trends={trends || []}
          />
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Total Revenue (90d)</div>
                <div className="text-3xl font-bold">₪{totalRevenue.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Daily Average</div>
                <div className="text-3xl font-bold">₪{avgRevenue.toFixed(0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">RevPAR</div>
                <div className="text-3xl font-bold">₪{avgRevPAR.toFixed(0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Growth</div>
                <div className={`text-3xl font-bold ${revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {revenueGrowth >= 0 ? "+" : ""}
                  {revenueGrowth.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historical Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Performance</CardTitle>
              <CardDescription>Monthly performance metrics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {historicalPerformance && historicalPerformance.length > 0 ? (
                  historicalPerformance.map((perf: any) => (
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
                        <div className="font-bold">₪{Number(perf.total_revenue || 0).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Bookings</div>
                        <div className="font-bold">{perf.total_bookings || 0}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">ADR</div>
                        <div className="font-bold">₪{Number(perf.avg_daily_rate || 0).toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">RevPAR</div>
                        <div className="font-bold">₪{Number(perf.revpar || 0).toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Occupancy</div>
                        <div className="font-bold">{Number(perf.occupancy_rate || 0).toFixed(0)}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No historical performance data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Optimizations Run</div>
                <div className="text-3xl font-bold">{optimizationHistory?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
                <div className="text-3xl font-bold text-green-600">{optimizationSuccessRate.toFixed(0)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground mb-1">Avg Price Change</div>
                <div className="text-3xl font-bold">
                  {optimizationHistory && optimizationHistory.length > 0
                    ? `${
                        (
                          optimizationHistory.reduce(
                            (sum: number, o: any) =>
                              sum + (Number(o.optimized_price || 0) - Number(o.original_price || 0)),
                            0,
                          ) / optimizationHistory.length
                        ).toFixed(0) >= 0
                          ? "+"
                          : ""
                      }₪${Math.abs(
                        optimizationHistory.reduce(
                          (sum: number, o: any) =>
                            sum + (Number(o.optimized_price || 0) - Number(o.original_price || 0)),
                          0,
                        ) / optimizationHistory.length,
                      ).toFixed(0)}`
                    : "₪0"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5" />
                Price Optimization History
              </CardTitle>
              <CardDescription>Recent price optimizations and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimizationHistory && optimizationHistory.length > 0 ? (
                  optimizationHistory.map((opt: any) => (
                    <div key={opt.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <ClockIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{new Date(opt.date).toLocaleDateString()}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {opt.optimization_reason || "Automated optimization"}
                        </div>
                      </div>
                      <div className="text-center px-4">
                        <div className="text-sm text-muted-foreground">Price Change</div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">₪{Number(opt.original_price || 0).toFixed(0)}</span>
                          <ArrowUpRightIcon className="h-4 w-4" />
                          <span className="font-bold">₪{Number(opt.optimized_price || 0).toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Performance</div>
                        <Badge variant={Number(opt.performance_score || 0) >= 0.7 ? "default" : "secondary"}>
                          {(Number(opt.performance_score || 0) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No optimization history yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
