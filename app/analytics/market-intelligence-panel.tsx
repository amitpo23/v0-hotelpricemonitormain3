"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Calendar,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Activity,
  AlertTriangle,
  Sun,
  CloudRain,
} from "lucide-react"

interface MarketIntelligencePanelProps {
  regionalData: any[]
  demandFactors: any[]
  trends: any[]
}

export function MarketIntelligencePanel({ regionalData, demandFactors, trends }: MarketIntelligencePanelProps) {
  // Group regional data by city
  const citiesData = regionalData.reduce((acc: any, item: any) => {
    if (!acc[item.city]) {
      acc[item.city] = []
    }
    acc[item.city].push(item)
    return acc
  }, {})

  // Get demand level color
  const getDemandColor = (level: string) => {
    switch (level) {
      case "peak":
        return "destructive"
      case "high":
        return "default"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  // Get trend icon
  const getTrendIcon = (type: string) => {
    switch (type) {
      case "price_increase":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "price_decrease":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case "demand_spike":
        return <Activity className="h-4 w-4 text-blue-500" />
      case "competitor_change":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  // Get weather icon
  const getWeatherIcon = (impact: string | null) => {
    if (!impact) return null
    if (impact.toLowerCase().includes("rain") || impact.toLowerCase().includes("storm")) {
      return <CloudRain className="h-4 w-4 text-blue-500" />
    }
    return <Sun className="h-4 w-4 text-amber-500" />
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Regional Market Overview */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Regional Market Data
          </CardTitle>
          <CardDescription>Occupancy and pricing trends by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(citiesData).length > 0 ? (
              Object.entries(citiesData)
                .slice(0, 5)
                .map(([city, data]: [string, any]) => {
                  const latestData = data[0]
                  const avgOccupancy =
                    data.reduce((sum: number, d: any) => sum + Number(d.avg_occupancy_rate || 0), 0) / data.length
                  const avgPrice =
                    data.reduce((sum: number, d: any) => sum + Number(d.avg_hotel_price || 0), 0) / data.length

                  return (
                    <div key={city} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold text-lg">{city}</span>
                          <span className="text-sm text-muted-foreground">({latestData.region})</span>
                        </div>
                        <Badge variant={getDemandColor(latestData.demand_level) as any}>
                          {latestData.demand_level?.toUpperCase() || "MEDIUM"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Avg Price</div>
                          <div className="text-lg font-bold">${avgPrice.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Occupancy</div>
                          <div className="text-lg font-bold">{avgOccupancy.toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Hotels</div>
                          <div className="text-lg font-bold">{latestData.total_hotels_tracked || 0}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Weather</div>
                          <div className="flex items-center gap-1">
                            {getWeatherIcon(latestData.weather_impact)}
                            <span className="text-sm">{latestData.weather_impact || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Events */}
                      {latestData.events && Array.isArray(latestData.events) && latestData.events.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="text-xs text-muted-foreground mb-2">Upcoming Events</div>
                          <div className="flex flex-wrap gap-2">
                            {latestData.events.slice(0, 3).map((event: any, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                <Calendar className="h-3 w-3 mr-1" />
                                {event.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
            ) : (
              <p className="text-muted-foreground text-center py-8">No regional data available yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Demand Factors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Demand Factors
          </CardTitle>
          <CardDescription>Events and conditions affecting demand</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demandFactors && demandFactors.length > 0 ? (
              demandFactors.slice(0, 8).map((factor: any) => (
                <div key={factor.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {factor.factor_type}
                      </Badge>
                    </div>
                    <div className="font-medium text-sm">{factor.factor_name}</div>
                    <div className="text-xs text-muted-foreground">{new Date(factor.date).toLocaleDateString()}</div>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      Number(factor.impact_score) > 0
                        ? "text-green-600"
                        : Number(factor.impact_score) < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
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

      {/* Market Trends */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Detected Market Trends
          </CardTitle>
          <CardDescription>Automatically detected patterns and changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trends && trends.length > 0 ? (
              trends.slice(0, 8).map((trend: any) => (
                <div key={trend.id} className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    {getTrendIcon(trend.trend_type)}
                    <span className="font-medium capitalize">{trend.trend_type.replace("_", " ")}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {trend.percentage_change && (
                      <span className={trend.percentage_change > 0 ? "text-green-600" : "text-red-600"}>
                        {trend.percentage_change > 0 ? "+" : ""}
                        {trend.percentage_change}%
                      </span>
                    )}
                    {trend.trend_value && !trend.percentage_change && (
                      <span>${Number(trend.trend_value).toFixed(0)}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {trend.description || new Date(trend.trend_date).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-8 col-span-4">No trends detected yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
