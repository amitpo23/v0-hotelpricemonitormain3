import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  MapPin,
  TrendingUp,
  Globe,
  Calendar,
  Cloud,
  Sun,
  Users,
  Building2,
  DollarSign,
  Activity,
  Sparkles,
} from "lucide-react"
import { FetchMarketDataButton } from "./fetch-market-data-button"

export default async function MarketIntelPage() {
  const supabase = await createClient()

  const [{ data: regionalData }, { data: demandFactors }, { data: competitorData }, { data: hotels }] =
    await Promise.all([
      supabase.from("regional_market_data").select("*").order("date", { ascending: false }).limit(100),
      supabase.from("demand_factors").select("*").order("date", { ascending: false }).limit(50),
      supabase.from("competitor_data").select("*").order("scraped_at", { ascending: false }).limit(200),
      supabase.from("hotels").select("*"),
    ])

  // Group regional data by city
  const citiesMap: Record<string, any[]> = {}
  regionalData?.forEach((item: any) => {
    if (!citiesMap[item.city]) citiesMap[item.city] = []
    citiesMap[item.city].push(item)
  })

  // Calculate market averages
  const avgRegionalPrice =
    regionalData && regionalData.length > 0
      ? regionalData.reduce((sum: number, r: any) => sum + Number(r.avg_hotel_price || 0), 0) / regionalData.length
      : 0

  const avgOccupancy =
    regionalData && regionalData.length > 0
      ? regionalData.reduce((sum: number, r: any) => sum + Number(r.avg_occupancy_rate || 0), 0) / regionalData.length
      : 0

  // Group demand factors by type
  const factorsByType: Record<string, any[]> = {}
  demandFactors?.forEach((f: any) => {
    if (!factorsByType[f.factor_type]) factorsByType[f.factor_type] = []
    factorsByType[f.factor_type].push(f)
  })

  // Get unique competitors
  const uniqueCompetitors = competitorData ? [...new Set(competitorData.map((c: any) => c.competitor_name))] : []

  const getDemandBadgeVariant = (level: string) => {
    switch (level) {
      case "peak":
        return "destructive"
      case "high":
        return "default"
      case "medium":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Globe className="h-10 w-10 text-primary" />
            Market Intelligence
          </h1>
          <p className="text-muted-foreground">Real-time market data, regional insights, and demand forecasting</p>
        </div>
        <FetchMarketDataButton />
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">Regions Tracked</span>
            </div>
            <div className="text-3xl font-bold">{Object.keys(citiesMap).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Market Avg Price</span>
            </div>
            <div className="text-3xl font-bold">${avgRegionalPrice.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-sm">Avg Occupancy</span>
            </div>
            <div className="text-3xl font-bold">{avgOccupancy.toFixed(0)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">Competitors</span>
            </div>
            <div className="text-3xl font-bold">{uniqueCompetitors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Demand Factors</span>
            </div>
            <div className="text-3xl font-bold">{demandFactors?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Regional Markets */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Regional Market Overview
              </CardTitle>
              <CardDescription>Latest market conditions by location</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(citiesMap).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(citiesMap)
                    .slice(0, 6)
                    .map(([city, data]) => {
                      const latest = data[0]
                      const avgPrice =
                        data.reduce((s: number, d: any) => s + Number(d.avg_hotel_price || 0), 0) / data.length
                      const avgOcc =
                        data.reduce((s: number, d: any) => s + Number(d.avg_occupancy_rate || 0), 0) / data.length

                      return (
                        <div key={city} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-bold text-lg flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-blue-500" />
                                {city}
                              </h3>
                              <p className="text-sm text-muted-foreground">{latest.region}</p>
                            </div>
                            <Badge variant={getDemandBadgeVariant(latest.demand_level) as any}>
                              {latest.demand_level?.toUpperCase() || "MEDIUM"} DEMAND
                            </Badge>
                          </div>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Avg Price</div>
                              <div className="font-bold text-lg">${avgPrice.toFixed(0)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Occupancy</div>
                              <div className="font-bold text-lg">{avgOcc.toFixed(0)}%</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Hotels</div>
                              <div className="font-bold text-lg">{latest.total_hotels_tracked || 0}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Weather</div>
                              <div className="font-bold text-lg flex items-center gap-1">
                                {latest.weather_impact?.toLowerCase().includes("rain") ? (
                                  <Cloud className="h-4 w-4 text-blue-400" />
                                ) : (
                                  <Sun className="h-4 w-4 text-amber-400" />
                                )}
                                {latest.weather_impact || "N/A"}
                              </div>
                            </div>
                          </div>

                          {latest.events && Array.isArray(latest.events) && latest.events.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Upcoming Events</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {latest.events.map((event: any, i: number) => (
                                  <Badge key={i} variant="outline">
                                    {event.name}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-2">No Regional Data Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Click "Fetch Market Data" to gather regional market intelligence
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Competitor Landscape */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Competitor Landscape
              </CardTitle>
              <CardDescription>Price positioning across booking platforms</CardDescription>
            </CardHeader>
            <CardContent>
              {uniqueCompetitors.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {uniqueCompetitors.slice(0, 6).map((competitor: string) => {
                    const compData = competitorData?.filter((c: any) => c.competitor_name === competitor) || []
                    const avgPrice =
                      compData.length > 0
                        ? compData.reduce((s: number, c: any) => s + Number(c.price), 0) / compData.length
                        : 0
                    const avgRating =
                      compData.filter((c: any) => c.rating).length > 0
                        ? compData.filter((c: any) => c.rating).reduce((s: number, c: any) => s + Number(c.rating), 0) /
                          compData.filter((c: any) => c.rating).length
                        : 0

                    return (
                      <div key={competitor} className="p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold">{competitor}</h4>
                          <Badge variant="outline">{compData.length} listings</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Avg Price</div>
                            <div className="font-bold">${avgPrice.toFixed(0)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Avg Rating</div>
                            <div className="font-bold">{avgRating.toFixed(1)} ⭐</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No competitor data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Demand Factors Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Demand Factors
              </CardTitle>
              <CardDescription>Events and conditions affecting pricing</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(factorsByType).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(factorsByType).map(([type, factors]) => (
                    <div key={type}>
                      <h4 className="font-medium text-sm text-muted-foreground uppercase mb-2">{type}</h4>
                      <div className="space-y-2">
                        {factors.slice(0, 3).map((factor: any) => (
                          <div key={factor.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{factor.factor_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(factor.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div
                              className={`font-bold ${
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
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No demand factors detected</p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/analytics">
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Activity className="h-4 w-4" />
                  View Full Analytics
                </Button>
              </Link>
              <Link href="/predictions">
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <TrendingUp className="h-4 w-4" />
                  Generate Predictions
                </Button>
              </Link>
              <Link href="/autopilot">
                <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                  <Sparkles className="h-4 w-4" />
                  Configure Autopilot
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
