"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, RefreshCwIcon, TrendingUpIcon, TrendingDownIcon } from "@/components/icons"

interface Hotel {
  id: string
  name: string
  base_price: number
  location?: string
}

interface YearlyPredictionsProps {
  hotels: Hotel[]
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

// Tel Aviv market data based on the research document
const MARKET_DATA = {
  seasonality: {
    0: { factor: 0.85, demand: "low", avgPrice: 139, tourists: "low" }, // January
    1: { factor: 0.8, demand: "very_low", avgPrice: 139, tourists: "lowest" }, // February
    2: { factor: 0.9, demand: "medium", avgPrice: 150, tourists: "growing" }, // March
    3: { factor: 1.0, demand: "high", avgPrice: 171, tourists: "passover" }, // April
    4: { factor: 1.05, demand: "high", avgPrice: 165, tourists: "high" }, // May
    5: { factor: 1.15, demand: "very_high", avgPrice: 175, tourists: "pride" }, // June
    6: { factor: 1.25, demand: "very_high", avgPrice: 185, tourists: "peak" }, // July
    7: { factor: 1.3, demand: "very_high", avgPrice: 190, tourists: "peak" }, // August
    8: { factor: 1.1, demand: "high", avgPrice: 165, tourists: "holidays" }, // September
    9: { factor: 0.95, demand: "medium", avgPrice: 155, tourists: "sukkot" }, // October
    10: { factor: 0.9, demand: "medium", avgPrice: 150, tourists: "declining" }, // November
    11: { factor: 1.2, demand: "high", avgPrice: 170, tourists: "holiday" }, // December
  },
  events: {
    0: ["New Year aftermath"],
    1: ["Tel Aviv Marathon"],
    2: ["Purim", "Spring break start"],
    3: ["Passover", "Easter tourism"],
    4: ["Independence Day", "Eurovision period"],
    5: ["Pride Week", "Summer start"],
    6: ["Peak summer", "European vacation"],
    7: ["Peak summer", "Family travel"],
    8: ["Rosh Hashanah", "Business conferences"],
    9: ["Sukkot", "Autumn tourism"],
    10: ["Low season", "Business travel"],
    11: ["Hanukkah", "Christmas tourism", "New Year's Eve"],
  },
}

export function YearlyPredictions({ hotels }: YearlyPredictionsProps) {
  const [selectedHotel, setSelectedHotel] = useState<string>(hotels[0]?.id || "")
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [monthlyData, setMonthlyData] = useState<any[]>([])

  const generateYearlyPredictions = async () => {
    setLoading(true)

    const hotel = hotels.find((h) => h.id === selectedHotel)
    if (!hotel) return

    const basePrice = hotel.base_price || 150
    const predictions: any[] = []

    for (let month = 0; month < 12; month++) {
      const marketData = MARKET_DATA.seasonality[month as keyof typeof MARKET_DATA.seasonality]
      const events = MARKET_DATA.events[month as keyof typeof MARKET_DATA.events]

      // Calculate predicted price based on market data
      const predictedPrice = Math.round(basePrice * marketData.factor)
      const marketAvg = marketData.avgPrice
      const priceDiff = (((predictedPrice - marketAvg) / marketAvg) * 100).toFixed(1)

      // Revenue projection (assuming 50 rooms, occupancy varies by season)
      const occupancyRates: Record<string, number> = {
        very_low: 45,
        low: 55,
        medium: 65,
        high: 75,
        very_high: 85,
      }
      const occupancy = occupancyRates[marketData.demand] || 65
      const daysInMonth = new Date(selectedYear, month + 1, 0).getDate()
      const projectedRevenue = Math.round(predictedPrice * 50 * (occupancy / 100) * daysInMonth)

      predictions.push({
        month,
        monthName: MONTHS[month],
        predictedPrice,
        marketAvg,
        priceDiff: Number(priceDiff),
        demand: marketData.demand,
        occupancy,
        projectedRevenue,
        events,
        tourists: marketData.tourists,
      })
    }

    setMonthlyData(predictions)
    setLoading(false)
  }

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case "very_high":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      case "very_low":
        return "bg-blue-500"
      default:
        return "bg-slate-500"
    }
  }

  const getDemandBgColor = (demand: string) => {
    switch (demand) {
      case "very_high":
        return "bg-red-50 border-red-200"
      case "high":
        return "bg-orange-50 border-orange-200"
      case "medium":
        return "bg-yellow-50 border-yellow-200"
      case "low":
        return "bg-green-50 border-green-200"
      case "very_low":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-slate-50 border-slate-200"
    }
  }

  const totalYearRevenue = monthlyData.reduce((sum, m) => sum + m.projectedRevenue, 0)
  const avgYearPrice =
    monthlyData.length > 0 ? Math.round(monthlyData.reduce((sum, m) => sum + m.predictedPrice, 0) / 12) : 0

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-500" />
            Yearly Price Predictions
          </CardTitle>
          <CardDescription>
            Generate monthly predictions based on Tel Aviv market data, seasonality, and tourism patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Hotel</label>
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generateYearlyPredictions} disabled={loading || !selectedHotel}>
              {loading ? (
                <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUpIcon className="h-4 w-4 mr-2" />
              )}
              Generate Yearly Forecast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {monthlyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Projected Annual Revenue</div>
              <div className="text-3xl font-bold">${(totalYearRevenue / 1000000).toFixed(2)}M</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Average Price</div>
              <div className="text-3xl font-bold">${avgYearPrice}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Peak Month</div>
              <div className="text-3xl font-bold">August</div>
              <div className="text-sm opacity-80">$190 avg</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Low Month</div>
              <div className="text-3xl font-bold">February</div>
              <div className="text-sm opacity-80">$139 avg</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Grid */}
      {monthlyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {monthlyData.map((month) => (
            <Card key={month.month} className={`border-2 ${getDemandBgColor(month.demand)}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{month.monthName}</CardTitle>
                  <div className={`w-3 h-3 rounded-full ${getDemandColor(month.demand)}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recommended Price</span>
                  <span className="text-2xl font-bold">${month.predictedPrice}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Market Avg</span>
                  <span className="flex items-center gap-1">
                    ${month.marketAvg}
                    {month.priceDiff > 0 ? (
                      <TrendingUpIcon className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDownIcon className="h-3 w-3 text-red-500" />
                    )}
                    <span className={month.priceDiff > 0 ? "text-green-600" : "text-red-600"}>
                      {month.priceDiff > 0 ? "+" : ""}
                      {month.priceDiff}%
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Occupancy</span>
                  <span className="font-medium">{month.occupancy}%</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">${(month.projectedRevenue / 1000).toFixed(0)}K</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Events & Factors:</div>
                  <div className="flex flex-wrap gap-1">
                    {month.events.map((event: string, i: number) => (
                      <span key={i} className="text-xs bg-white/50 px-2 py-0.5 rounded">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs capitalize text-center pt-2 border-t">
                  <span className={`px-2 py-1 rounded ${getDemandColor(month.demand)} text-white`}>
                    {month.demand.replace("_", " ")} demand
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {monthlyData.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No yearly predictions yet</h3>
            <p className="text-slate-500">
              Select a hotel and click "Generate Yearly Forecast" to see monthly predictions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
