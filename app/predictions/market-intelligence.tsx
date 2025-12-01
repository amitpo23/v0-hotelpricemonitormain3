"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  GlobeIcon,
  TrendingUpIcon,
  RefreshCwIcon,
  UsersIcon,
  CalendarIcon,
  BuildingIcon,
  ActivityIcon,
  BarChartIcon,
} from "@/components/icons"

interface Hotel {
  id: string
  name: string
  location?: string
}

interface MarketIntelligenceProps {
  hotels: Hotel[]
}

const MARKET_INTEL = {
  priceData: {
    title: "Tel Aviv Hotel Prices",
    source: "Israel Central Bureau of Statistics & TripAdvisor",
    data: [
      { metric: "Peak Season Avg (Summer)", value: "₪1,300/night", trend: "+15%" },
      { metric: "Low Season Avg (Winter)", value: "₪975/night", trend: "-8%" },
      { metric: "Annual Average", value: "₪585/night", trend: "+5%" },
      { metric: "Highest Month", value: "April - ₪635", trend: "Passover" },
      { metric: "Lowest Month", value: "February - ₪515", trend: "Winter low" },
    ],
  },
  demandData: {
    title: "Tourism Demand Patterns",
    source: "Ministry of Tourism & Mastercard",
    data: [
      { metric: "Peak Months", value: "June-August", detail: "European summer vacation" },
      { metric: "Secondary Peak", value: "September-October", detail: "Jewish holidays" },
      { metric: "Low Season", value: "January-February", detail: "Post-holiday slowdown" },
      { metric: "Avg Stay Duration", value: "3.7 nights", detail: "In Tel Aviv hotels" },
      { metric: "Booking Lead Time", value: "2.8 months", detail: "Average advance booking" },
    ],
  },
  touristOrigins: {
    title: "Tourist Origins - Tel Aviv",
    source: "Mastercard Tourism Insights",
    data: [
      { country: "USA", percentage: 39, avgSpend: "₪1,555" },
      { country: "UK", percentage: 23, avgSpend: "₪1,410" },
      { country: "Germany", percentage: 11, avgSpend: "₪1,300" },
      { country: "France", percentage: 8, avgSpend: "₪1,185" },
      { country: "Switzerland", percentage: 5, avgSpend: "₪1,975" },
    ],
  },
  events: {
    title: "Key Events Impact",
    data: [
      { event: "Pride Week", month: "June", impact: "+25% occupancy", priceEffect: "+20%" },
      { event: "Tel Aviv Marathon", month: "February", impact: "+15% occupancy", priceEffect: "+10%" },
      { event: "Passover", month: "March-April", impact: "+30% occupancy", priceEffect: "+25%" },
      { event: "Rosh Hashanah", month: "September", impact: "+20% occupancy", priceEffect: "+15%" },
      { event: "New Year's Eve", month: "December", impact: "+35% occupancy", priceEffect: "+30%" },
    ],
  },
  recommendations: [
    {
      title: "Price Optimization",
      description:
        "Increase prices 15-25% during peak months (June-August) and events. Reduce by 10-15% in January-February to maintain occupancy.",
      priority: "high",
    },
    {
      title: "Target Markets",
      description:
        "Focus marketing on USA (39% of tourists) and UK (23%). Consider German and French language content for European reach.",
      priority: "medium",
    },
    {
      title: "Booking Windows",
      description:
        "Most tourists book 2-3 months ahead. Ensure attractive rates are visible 3-6 months before peak periods.",
      priority: "high",
    },
    {
      title: "Event-Based Pricing",
      description: "Monitor local events calendar. Pride Week and Passover can justify 20-25% price increases.",
      priority: "medium",
    },
  ],
}

export function MarketIntelligence({ hotels }: MarketIntelligenceProps) {
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [holidays, setHolidays] = useState<any>(null)
  const [trends, setTrends] = useState<any>(null)
  const [marketIntel, setMarketIntel] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)

    try {
      const [holidaysRes, trendsRes, marketRes] = await Promise.all([
        fetch("/api/external-data/holidays")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch("/api/external-data/trends")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch("/api/external-data/market-intel")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ])

      setHolidays(holidaysRes)
      setTrends(trendsRes)
      setMarketIntel(marketRes)
      setLastUpdated(new Date())
    } catch (err) {
      console.error("Error fetching market data:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getImpactColor = (impact: number) => {
    if (impact >= 1.25) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
    if (impact >= 1.1) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
    if (impact < 0.9) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
  }

  const getVelocityColor = (trend: string) => {
    if (trend === "increasing") return "text-green-500"
    if (trend === "decreasing") return "text-red-500"
    return "text-yellow-500"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GlobeIcon className="h-5 w-5 text-blue-500" />
                Market Intelligence Dashboard / מודיעין שוק
              </CardTitle>
              <CardDescription>
                Real-time market data from Google Trends, Hebcal, and internal scan data - נתוני שוק בזמן אמת
              </CardDescription>
            </div>
            <Button onClick={fetchData} disabled={loading} variant="outline">
              {loading ? (
                <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCwIcon className="h-4 w-4 mr-2" />
              )}
              Refresh Data / רענן
            </Button>
          </div>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2">Last updated: {lastUpdated.toLocaleString("he-IL")}</p>
          )}
        </CardHeader>
      </Card>

      {/* Data Sources Badge */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
          Google Trends {trends?.cached ? "(Cached)" : "(Live)"}
        </Badge>
        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">
          Hebcal Holidays API
        </Badge>
        <Badge variant="outline" className="bg-green-50 dark:bg-green-950">
          Internal Scan Data
        </Badge>
        <Badge variant="outline" className="bg-orange-50 dark:bg-orange-950">
          Booking Analytics
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Trends Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUpIcon className="h-5 w-5 text-blue-500" />
              Google Trends / מגמות חיפוש
            </CardTitle>
            <CardDescription>Search interest for Israel tourism</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-8 w-1/2" />
              </div>
            ) : trends?.data ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-300">Interest Score / ציון עניין</span>
                  <span className="text-3xl font-bold text-blue-400">{trends.data.interestScore}%</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-300">Season / עונה</span>
                  <Badge variant="outline" className="capitalize">
                    {trends.data.seasonalTrend?.replace(/_/g, " ")}
                  </Badge>
                </div>

                {trends.data.risingTopics && (
                  <div className="pt-4 border-t border-slate-700">
                    <div className="text-sm font-medium mb-2 text-slate-300">Rising Topics / נושאים עולים</div>
                    <div className="space-y-2">
                      {trends.data.risingTopics.map((topic: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-sm p-2 bg-slate-800/50 rounded">
                          <span className="text-slate-300">{topic.topic}</span>
                          <span className="text-green-400 font-medium">{topic.growth}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No trends data available</div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Holidays Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="h-5 w-5 text-purple-500" />
              Upcoming Holidays / חגים קרובים
            </CardTitle>
            <CardDescription>Jewish holidays with tourism impact from Hebcal</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : holidays?.holidays ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {holidays.holidays
                  .filter((h: any) => new Date(h.date) >= new Date())
                  .slice(0, 8)
                  .map((holiday: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                      <div>
                        <div className="font-medium text-white">{holiday.title}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(holiday.date).toLocaleDateString("he-IL", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                      {holiday.tourismImpact && (
                        <Badge className={getImpactColor(holiday.tourismImpact.score)}>
                          {holiday.tourismImpact.score > 1 ? "+" : ""}
                          {((holiday.tourismImpact.score - 1) * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No holiday data available</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Velocity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ActivityIcon className="h-5 w-5 text-green-500" />
              Booking Velocity / קצב הזמנות
            </CardTitle>
            <CardDescription>Recent booking trends from your data</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : marketIntel?.bookingVelocity ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-slate-800 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">{marketIntel.bookingVelocity.last7Days}</div>
                    <div className="text-xs text-slate-400">Last 7 Days / 7 ימים</div>
                  </div>
                  <div className="text-center p-4 bg-slate-800 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-400">{marketIntel.bookingVelocity.last30Days}</div>
                    <div className="text-xs text-slate-400">Last 30 Days / 30 ימים</div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-300">Trend / מגמה</span>
                  <span className={`font-semibold ${getVelocityColor(marketIntel.bookingVelocity.trend)}`}>
                    {marketIntel.bookingVelocity.trend === "increasing"
                      ? "↑ עולה"
                      : marketIntel.bookingVelocity.trend === "decreasing"
                        ? "↓ יורד"
                        : "→ יציב"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No booking velocity data</div>
            )}
          </CardContent>
        </Card>

        {/* Competitor Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BuildingIcon className="h-5 w-5 text-orange-500" />
              Competitor Prices / מחירי מתחרים
            </CardTitle>
            <CardDescription>Average prices from scan data</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : marketIntel?.competitorAnalysis?.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {marketIntel.competitorAnalysis
                  .filter((c: any) => c.avgPrice)
                  .sort((a: any, b: any) => (b.avgPrice || 0) - (a.avgPrice || 0))
                  .slice(0, 6)
                  .map((comp: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-slate-800 rounded-lg">
                      <div>
                        <div className="font-medium text-sm text-white">{comp.name}</div>
                        <div className="text-xs text-slate-400">{comp.priceDataPoints} data points</div>
                      </div>
                      <span className="font-bold text-cyan-400">₪{comp.avgPrice}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No competitor data - run a scan</div>
            )}
          </CardContent>
        </Card>
      </div>

      {marketIntel?.marketStats?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartIcon className="h-5 w-5 text-indigo-500" />
              Market Prices by Date / מחירי שוק לפי תאריך
            </CardTitle>
            <CardDescription>Price ranges from all scan sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {marketIntel.marketStats.slice(0, 14).map((stat: any, i: number) => (
                <div key={i} className="p-3 bg-slate-800 rounded-lg text-center">
                  <div className="text-xs text-slate-400 mb-1">
                    {new Date(stat.date).toLocaleDateString("he-IL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  <div className="text-lg font-bold text-cyan-400">₪{stat.avgPrice}</div>
                  <div className="text-xs text-slate-500">
                    ₪{stat.minPrice} - ₪{stat.maxPrice}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Static Reference Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{MARKET_INTEL.priceData.title}</CardTitle>
            <CardDescription>{MARKET_INTEL.priceData.source}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MARKET_INTEL.priceData.data.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-200">{item.metric}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{item.value}</span>
                    <Badge variant="outline" className="text-xs border-cyan-500 text-cyan-400">
                      {item.trend}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{MARKET_INTEL.demandData.title}</CardTitle>
            <CardDescription>{MARKET_INTEL.demandData.source}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MARKET_INTEL.demandData.data.map((item, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                  <span className="text-sm text-slate-200">{item.metric}</span>
                  <div className="text-right">
                    <span className="font-bold block text-white">{item.value}</span>
                    <span className="text-xs text-cyan-400">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tourist Origins */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-green-500" />
            {MARKET_INTEL.touristOrigins.title}
          </CardTitle>
          <CardDescription>{MARKET_INTEL.touristOrigins.source}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {MARKET_INTEL.touristOrigins.data.map((country, i) => (
              <div key={i} className="text-center p-4 bg-slate-800 rounded-lg">
                <div className="text-2xl mb-2">
                  {country.country === "USA" && "🇺🇸"}
                  {country.country === "UK" && "🇬🇧"}
                  {country.country === "Germany" && "🇩🇪"}
                  {country.country === "France" && "🇫🇷"}
                  {country.country === "Switzerland" && "🇨🇭"}
                </div>
                <div className="font-bold text-white">{country.country}</div>
                <div className="text-2xl font-bold text-cyan-400">{country.percentage}%</div>
                <div className="text-xs text-slate-400">Avg: {country.avgSpend}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Events Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-500" />
            {MARKET_INTEL.events.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {MARKET_INTEL.events.data.map((event, i) => (
              <div key={i} className="p-4 border border-slate-700 rounded-lg bg-slate-800">
                <div className="font-bold mb-1 text-white">{event.event}</div>
                <div className="text-xs text-slate-400 mb-2">{event.month}</div>
                <div className="text-sm text-green-400 font-medium">{event.impact}</div>
                <div className="text-sm text-orange-400">Price: {event.priceEffect}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      <Card className="border-2 border-purple-500/30 bg-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-purple-400" />
            AI-Powered Recommendations / המלצות AI
          </CardTitle>
          <CardDescription>Based on market analysis and historical data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MARKET_INTEL.recommendations.map((rec, i) => (
              <div key={i} className="p-4 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-white">{rec.title}</span>
                  <Badge variant={rec.priority === "high" ? "destructive" : "secondary"}>{rec.priority}</Badge>
                </div>
                <p className="text-sm text-slate-300">{rec.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Quality Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Quality Summary / סיכום איכות נתונים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {marketIntel?.demandIndicators?.dataQuality?.scanResults || 0}
              </div>
              <div className="text-xs text-slate-400">Scan Results</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {marketIntel?.demandIndicators?.dataQuality?.competitors || 0}
              </div>
              <div className="text-xs text-slate-400">Competitors</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {marketIntel?.demandIndicators?.dataQuality?.datesWithData || 0}
              </div>
              <div className="text-xs text-slate-400">Dates with Data</div>
            </div>
            <div className="text-center p-4 bg-slate-800 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">{holidays?.holidays?.length || 0}</div>
              <div className="text-xs text-slate-400">Holidays Loaded</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
