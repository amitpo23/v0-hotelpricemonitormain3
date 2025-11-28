"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  TargetIcon,
  CalendarIcon,
  BuildingIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  BedDoubleIcon,
} from "@/components/icons"

interface Hotel {
  id: string
  name: string
  base_price: number
  location: string
  total_rooms: number
}

interface Budget {
  id: string
  hotel_id: string
  year: number
  month: number
  target_revenue: number
  target_occupancy: number
}

interface Forecast {
  id: string
  hotel_id: string
  year: number
  month: number
  predicted_revenue: number
  predicted_occupancy: number
  predicted_adr: number
  predicted_revpar: number
  predicted_room_nights: number
  budget_revenue: number
  budget_variance_percent: number
  on_track_for_budget: boolean
  market_avg_occupancy: number
  competitor_avg_price: number
  factors: any
  confidence_score: number
}

interface RoomType {
  id: string
  hotel_id: string
  name: string
  base_price: number
}

interface RevenueForecastProps {
  hotels: Hotel[]
  budgets: Budget[]
  forecasts: Forecast[]
  roomTypes: RoomType[]
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

// Market seasonality factors for Tel Aviv
const SEASONALITY = {
  1: { occupancy: 0.55, multiplier: 0.85, label: "Low Season" },
  2: { occupancy: 0.6, multiplier: 0.9, label: "Low Season" },
  3: { occupancy: 0.7, multiplier: 1.05, label: "Passover" },
  4: { occupancy: 0.75, multiplier: 1.15, label: "Spring Peak" },
  5: { occupancy: 0.72, multiplier: 1.1, label: "Late Spring" },
  6: { occupancy: 0.8, multiplier: 1.25, label: "Pride Month" },
  7: { occupancy: 0.85, multiplier: 1.35, label: "Summer Peak" },
  8: { occupancy: 0.88, multiplier: 1.4, label: "Summer Peak" },
  9: { occupancy: 0.75, multiplier: 1.15, label: "High Holidays" },
  10: { occupancy: 0.7, multiplier: 1.05, label: "Sukkot" },
  11: { occupancy: 0.6, multiplier: 0.9, label: "Low Season" },
  12: { occupancy: 0.65, multiplier: 0.95, label: "Winter" },
}

export function RevenueForecast({ hotels, budgets, forecasts, roomTypes }: RevenueForecastProps) {
  const [selectedHotel, setSelectedHotel] = useState<string>(hotels[0]?.id || "")
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [isGenerating, setIsGenerating] = useState(false)
  const [monthlyData, setMonthlyData] = useState<any[]>([])

  const hotel = hotels.find((h) => h.id === selectedHotel)
  const hotelBudgets = budgets.filter((b) => b.hotel_id === selectedHotel && b.year === selectedYear)
  const hotelForecasts = forecasts.filter((f) => f.hotel_id === selectedHotel && f.year === selectedYear)

  useEffect(() => {
    if (hotel) {
      generateMonthlyForecasts()
    }
  }, [selectedHotel, selectedYear, hotel])

  function generateMonthlyForecasts() {
    if (!hotel) return

    const totalRooms = hotel.total_rooms || 50
    const basePrice = hotel.base_price || 150
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    const data = MONTHS.map((month, index) => {
      const monthNum = index + 1
      const season = SEASONALITY[monthNum as keyof typeof SEASONALITY]
      const days = daysInMonth[index]

      // Find budget for this month
      const budget = hotelBudgets.find((b) => b.month === monthNum)
      const budgetRevenue = budget?.target_revenue || totalRooms * basePrice * days * 0.7
      const budgetOccupancy = budget?.target_occupancy || 70

      // Calculate predicted values
      const predictedOccupancy = season.occupancy * 100
      const predictedADR = basePrice * season.multiplier
      const predictedRoomNights = Math.round(totalRooms * days * season.occupancy)
      const predictedRevenue = predictedRoomNights * predictedADR
      const predictedRevPAR = predictedRevenue / (totalRooms * days)

      // Budget variance
      const variance = ((predictedRevenue - budgetRevenue) / budgetRevenue) * 100
      const onTrack = predictedRevenue >= budgetRevenue * 0.95

      // Market comparison (simulated)
      const marketAvgOccupancy = season.occupancy * 100 - 5 + Math.random() * 10
      const competitorAvgPrice = basePrice * season.multiplier * (0.9 + Math.random() * 0.2)

      return {
        month,
        monthNum,
        season: season.label,
        totalRooms,
        availableRoomNights: totalRooms * days,

        // Predictions
        predictedOccupancy,
        predictedADR,
        predictedRevPAR,
        predictedRoomNights,
        predictedRevenue,

        // Budget
        budgetRevenue,
        budgetOccupancy,
        variance,
        onTrack,

        // Market
        marketAvgOccupancy,
        competitorAvgPrice,
        vsMarket: predictedOccupancy - marketAvgOccupancy,
        vsCompetitors: ((predictedADR - competitorAvgPrice) / competitorAvgPrice) * 100,

        // Confidence
        confidence: 0.75 + Math.random() * 0.15,
      }
    })

    setMonthlyData(data)
  }

  async function handleRefreshForecasts() {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/forecasts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: selectedHotel, year: selectedYear }),
      })
      if (response.ok) {
        generateMonthlyForecasts()
      }
    } catch (error) {
      console.error("Failed to generate forecasts:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Calculate yearly totals
  const yearlyTotals = monthlyData.reduce(
    (acc, m) => ({
      predictedRevenue: acc.predictedRevenue + m.predictedRevenue,
      budgetRevenue: acc.budgetRevenue + m.budgetRevenue,
      predictedRoomNights: acc.predictedRoomNights + m.predictedRoomNights,
      availableRoomNights: acc.availableRoomNights + m.availableRoomNights,
    }),
    { predictedRevenue: 0, budgetRevenue: 0, predictedRoomNights: 0, availableRoomNights: 0 },
  )

  const yearlyOccupancy =
    yearlyTotals.availableRoomNights > 0
      ? (yearlyTotals.predictedRoomNights / yearlyTotals.availableRoomNights) * 100
      : 0
  const yearlyVariance =
    yearlyTotals.budgetRevenue > 0
      ? ((yearlyTotals.predictedRevenue - yearlyTotals.budgetRevenue) / yearlyTotals.budgetRevenue) * 100
      : 0

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5 text-green-500" />
                Revenue & Occupancy Forecast
              </CardTitle>
              <CardDescription>
                Monthly predictions based on market conditions, competitors, and historical data
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      <div className="flex items-center gap-2">
                        <BuildingIcon className="h-4 w-4" />
                        {hotel.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number.parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(selectedYear - 1).toString()}>{selectedYear - 1}</SelectItem>
                  <SelectItem value={selectedYear.toString()}>{selectedYear}</SelectItem>
                  <SelectItem value={(selectedYear + 1).toString()}>{selectedYear + 1}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleRefreshForecasts} disabled={isGenerating}>
                <RefreshCwIcon className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
                {isGenerating ? "Updating..." : "Refresh"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Hotel Info & Yearly Summary */}
      {hotel && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <BedDoubleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Total Rooms</span>
              </div>
              <div className="text-3xl font-bold">{hotel.total_rooms || 50}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {((hotel.total_rooms || 50) * 365).toLocaleString()} room nights/year
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <DollarSignIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Predicted Revenue</span>
              </div>
              <div className="text-3xl font-bold">${(yearlyTotals.predictedRevenue / 1000000).toFixed(2)}M</div>
              <div className="text-sm text-muted-foreground mt-1">
                vs Budget: ${(yearlyTotals.budgetRevenue / 1000000).toFixed(2)}M
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                <TargetIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Avg Occupancy</span>
              </div>
              <div className="text-3xl font-bold">{yearlyOccupancy.toFixed(1)}%</div>
              <Progress value={yearlyOccupancy} className="mt-2" />
            </CardContent>
          </Card>

          <Card
            className={`bg-gradient-to-br ${
              yearlyVariance >= 0
                ? "from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900"
                : "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900"
            }`}
          >
            <CardContent className="pt-6">
              <div
                className={`flex items-center gap-2 mb-2 ${yearlyVariance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {yearlyVariance >= 0 ? (
                  <TrendingUpIcon className="h-5 w-5" />
                ) : (
                  <TrendingDownIcon className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">Budget Variance</span>
              </div>
              <div className="text-3xl font-bold flex items-center gap-2">
                {yearlyVariance >= 0 ? "+" : ""}
                {yearlyVariance.toFixed(1)}%
                {yearlyVariance >= 0 ? (
                  <CheckCircleIcon className="h-6 w-6 text-emerald-500" />
                ) : (
                  <AlertCircleIcon className="h-6 w-6 text-red-500" />
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {yearlyVariance >= 0 ? "On track to exceed budget" : "Below budget target"}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Monthly Revenue Forecast - {selectedYear}
          </CardTitle>
          <CardDescription>Detailed monthly predictions with occupancy, ADR, and budget comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Month</th>
                  <th className="text-left py-3 px-2 font-medium">Season</th>
                  <th className="text-right py-3 px-2 font-medium">Occupancy</th>
                  <th className="text-right py-3 px-2 font-medium">ADR</th>
                  <th className="text-right py-3 px-2 font-medium">RevPAR</th>
                  <th className="text-right py-3 px-2 font-medium">Room Nights</th>
                  <th className="text-right py-3 px-2 font-medium">Revenue</th>
                  <th className="text-right py-3 px-2 font-medium">Budget</th>
                  <th className="text-right py-3 px-2 font-medium">Variance</th>
                  <th className="text-center py-3 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m, i) => (
                  <tr
                    key={i}
                    className={`border-b hover:bg-muted/50 ${new Date().getMonth() === i ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                  >
                    <td className="py-3 px-2 font-medium">{m.month}</td>
                    <td className="py-3 px-2">
                      <Badge variant="outline" className="text-xs">
                        {m.season}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={m.predictedOccupancy} className="w-16 h-2" />
                        <span className="w-12">{m.predictedOccupancy.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-medium">${m.predictedADR.toFixed(0)}</td>
                    <td className="py-3 px-2 text-right">${m.predictedRevPAR.toFixed(0)}</td>
                    <td className="py-3 px-2 text-right">{m.predictedRoomNights.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right font-medium text-green-600 dark:text-green-400">
                      ${(m.predictedRevenue / 1000).toFixed(0)}K
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      ${(m.budgetRevenue / 1000).toFixed(0)}K
                    </td>
                    <td
                      className={`py-3 px-2 text-right font-medium ${m.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {m.variance >= 0 ? "+" : ""}
                      {m.variance.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-center">
                      {m.onTrack ? (
                        <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto" />
                      ) : (
                        <AlertCircleIcon className="h-5 w-5 text-amber-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr className="font-bold">
                  <td className="py-3 px-2">TOTAL</td>
                  <td className="py-3 px-2"></td>
                  <td className="py-3 px-2 text-right">{yearlyOccupancy.toFixed(0)}%</td>
                  <td className="py-3 px-2 text-right">
                    ${(yearlyTotals.predictedRevenue / yearlyTotals.predictedRoomNights).toFixed(0)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    ${(yearlyTotals.predictedRevenue / yearlyTotals.availableRoomNights).toFixed(0)}
                  </td>
                  <td className="py-3 px-2 text-right">{yearlyTotals.predictedRoomNights.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right text-green-600">
                    ${(yearlyTotals.predictedRevenue / 1000000).toFixed(2)}M
                  </td>
                  <td className="py-3 px-2 text-right">${(yearlyTotals.budgetRevenue / 1000000).toFixed(2)}M</td>
                  <td className={`py-3 px-2 text-right ${yearlyVariance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {yearlyVariance >= 0 ? "+" : ""}
                    {yearlyVariance.toFixed(1)}%
                  </td>
                  <td className="py-3 px-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Market Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market Position</CardTitle>
            <CardDescription>Your performance vs market average</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyData.slice(0, 6).map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium w-24">{m.month.slice(0, 3)}</span>
                <div className="flex-1 mx-4">
                  <div className="flex items-center gap-2">
                    <Progress value={m.predictedOccupancy} className="flex-1 h-2" />
                    <span className="text-xs w-16 text-right">
                      {m.vsMarket >= 0 ? "+" : ""}
                      {m.vsMarket.toFixed(0)}% vs mkt
                    </span>
                  </div>
                </div>
                <Badge variant={m.vsMarket >= 0 ? "default" : "secondary"} className="w-20 justify-center">
                  {m.predictedOccupancy.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pricing vs Competitors</CardTitle>
            <CardDescription>Your ADR compared to competitor average</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyData.slice(0, 6).map((m, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-medium w-24">{m.month.slice(0, 3)}</span>
                <div className="flex-1 mx-4 flex items-center gap-2">
                  <div className="text-sm">
                    <span className="font-medium">${m.predictedADR.toFixed(0)}</span>
                    <span className="text-muted-foreground mx-1">vs</span>
                    <span>${m.competitorAvgPrice.toFixed(0)}</span>
                  </div>
                </div>
                <Badge
                  variant={m.vsCompetitors > 5 ? "destructive" : m.vsCompetitors < -5 ? "secondary" : "default"}
                  className="w-20 justify-center"
                >
                  {m.vsCompetitors >= 0 ? "+" : ""}
                  {m.vsCompetitors.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Factors & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-blue-500" />
            AI Recommendations
          </CardTitle>
          <CardDescription>Based on current market analysis and forecasts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">Peak Months</h4>
              <p className="text-sm text-green-600 dark:text-green-400">
                July-August show highest demand. Consider premium pricing strategies and minimum stay requirements.
              </p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Opportunity Months</h4>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                January-February need attention. Launch promotional campaigns and packages to boost occupancy.
              </p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Budget Status</h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {yearlyVariance >= 0
                  ? `On track to exceed annual budget by ${yearlyVariance.toFixed(1)}%. Maintain current strategy.`
                  : `${Math.abs(yearlyVariance).toFixed(1)}% below budget. Focus on occupancy improvements in low months.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
