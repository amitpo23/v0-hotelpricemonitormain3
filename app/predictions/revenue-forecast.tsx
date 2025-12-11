"use client"

import { useState } from "react"
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
  InfoIcon,
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

export function RevenueForecast({ hotels, budgets, forecasts, roomTypes }: RevenueForecastProps) {
  const [selectedHotel, setSelectedHotel] = useState<string>(hotels[0]?.id || "")
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [isGenerating, setIsGenerating] = useState(false)

  const hotel = hotels.find((h) => h.id === selectedHotel)
  const hotelBudgets = budgets.filter((b) => b.hotel_id === selectedHotel && b.year === selectedYear)
  const hotelForecasts = forecasts.filter((f) => f.hotel_id === selectedHotel && f.year === selectedYear)

  const monthlyData = MONTHS.map((month, index) => {
    const monthNum = index + 1
    const forecast = hotelForecasts.find((f) => f.month === monthNum)
    const budget = hotelBudgets.find((b) => b.month === monthNum)

    if (!forecast) {
      return {
        month,
        monthNum,
        hasData: false,
      }
    }

    return {
      month,
      monthNum,
      hasData: true,
      season: forecast.factors?.season || "",
      totalRooms: hotel?.total_rooms || 0,
      predictedOccupancy: forecast.predicted_occupancy || 0,
      predictedADR: forecast.predicted_adr || 0,
      predictedRevPAR: forecast.predicted_revpar || 0,
      predictedRoomNights: forecast.predicted_room_nights || 0,
      predictedRevenue: forecast.predicted_revenue || 0,
      budgetRevenue: budget?.target_revenue || forecast.budget_revenue || 0,
      budgetOccupancy: budget?.target_occupancy || 0,
      variance: forecast.budget_variance_percent || 0,
      onTrack: forecast.on_track_for_budget || false,
      marketAvgOccupancy: forecast.market_avg_occupancy || 0,
      competitorAvgPrice: forecast.competitor_avg_price || 0,
      vsMarket: (forecast.predicted_occupancy || 0) - (forecast.market_avg_occupancy || 0),
      vsCompetitors:
        forecast.competitor_avg_price > 0
          ? ((forecast.predicted_adr - forecast.competitor_avg_price) / forecast.competitor_avg_price) * 100
          : 0,
      confidence: forecast.confidence_score || 0,
    }
  })

  const dataWithValues = monthlyData.filter((m) => m.hasData)
  const hasAnyData = dataWithValues.length > 0

  async function handleRefreshForecasts() {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/forecasts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: selectedHotel, year: selectedYear }),
      })
      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to generate forecasts:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Calculate yearly totals only from real data
  const yearlyTotals = dataWithValues.reduce(
    (acc, m: any) => ({
      predictedRevenue: acc.predictedRevenue + (m.predictedRevenue || 0),
      budgetRevenue: acc.budgetRevenue + (m.budgetRevenue || 0),
      predictedRoomNights: acc.predictedRoomNights + (m.predictedRoomNights || 0),
      availableRoomNights: acc.availableRoomNights + (m.totalRooms || 0) * 30,
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
              <CardDescription>Monthly predictions based on real market data and competitor prices</CardDescription>
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
                {isGenerating ? "Generating..." : "Generate Forecasts"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!hasAnyData && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="py-8 text-center">
            <InfoIcon className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Forecast Data Available</h3>
            <p className="text-muted-foreground mb-4">
              Run the scraper first to collect competitor prices, then generate forecasts based on real market data.
            </p>
            <Button onClick={handleRefreshForecasts} disabled={isGenerating}>
              <RefreshCwIcon className={`h-4 w-4 mr-2 ${isGenerating ? "animate-spin" : ""}`} />
              Generate Forecasts from Real Data
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hotel Info & Yearly Summary - only show if we have data */}
      {hotel && hasAnyData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                <BedDoubleIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Total Rooms</span>
              </div>
              <div className="text-3xl font-bold">{hotel.total_rooms || 0}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {((hotel.total_rooms || 0) * 365).toLocaleString()} room nights/year
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <DollarSignIcon className="h-5 w-5" />
                <span className="text-sm font-medium">Predicted Revenue</span>
              </div>
              <div className="text-3xl font-bold">₪{(yearlyTotals.predictedRevenue / 1000000).toFixed(2)}M</div>
              <div className="text-sm text-muted-foreground mt-1">
                vs Budget: ₪{(yearlyTotals.budgetRevenue / 1000000).toFixed(2)}M
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

      {/* Monthly Breakdown - only show if we have data */}
      {hasAnyData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Monthly Revenue Forecast - {selectedYear}
            </CardTitle>
            <CardDescription>Based on real scraped competitor prices and market data</CardDescription>
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
                  {monthlyData.map((m: any, i) => (
                    <tr
                      key={i}
                      className={`border-b hover:bg-muted/50 ${!m.hasData ? "opacity-40" : ""} ${new Date().getMonth() === i ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                    >
                      <td className="py-3 px-2 font-medium">{m.month}</td>
                      <td className="py-3 px-2">
                        {m.hasData ? (
                          <Badge variant="outline" className="text-xs">
                            {m.season || "—"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">No data</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {m.hasData ? (
                          <div className="flex items-center justify-end gap-2">
                            <Progress value={m.predictedOccupancy} className="w-16 h-2" />
                            <span className="w-12">{m.predictedOccupancy.toFixed(0)}%</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {m.hasData ? `₪${m.predictedADR.toFixed(0)}` : "—"}
                      </td>
                      <td className="py-3 px-2 text-right">{m.hasData ? `₪${m.predictedRevPAR.toFixed(0)}` : "—"}</td>
                      <td className="py-3 px-2 text-right">
                        {m.hasData ? m.predictedRoomNights.toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-green-600 dark:text-green-400">
                        {m.hasData ? `₪${(m.predictedRevenue / 1000).toFixed(0)}K` : "—"}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {m.hasData && m.budgetRevenue ? `₪${(m.budgetRevenue / 1000).toFixed(0)}K` : "—"}
                      </td>
                      <td
                        className={`py-3 px-2 text-right font-medium ${m.hasData ? (m.variance >= 0 ? "text-emerald-600" : "text-red-600") : ""}`}
                      >
                        {m.hasData ? `${m.variance >= 0 ? "+" : ""}${m.variance.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {m.hasData ? (
                          m.onTrack ? (
                            <CheckCircleIcon className="h-5 w-5 text-emerald-500 mx-auto" />
                          ) : (
                            <AlertCircleIcon className="h-5 w-5 text-amber-500 mx-auto" />
                          )
                        ) : (
                          "—"
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
                      {yearlyTotals.predictedRoomNights > 0
                        ? `₪${(yearlyTotals.predictedRevenue / yearlyTotals.predictedRoomNights).toFixed(0)}`
                        : "—"}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {yearlyTotals.availableRoomNights > 0
                        ? `₪${(yearlyTotals.predictedRevenue / yearlyTotals.availableRoomNights).toFixed(0)}`
                        : "—"}
                    </td>
                    <td className="py-3 px-2 text-right">{yearlyTotals.predictedRoomNights.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-green-600">
                      ₪{(yearlyTotals.predictedRevenue / 1000000).toFixed(2)}M
                    </td>
                    <td className="py-3 px-2 text-right">₪{(yearlyTotals.budgetRevenue / 1000000).toFixed(2)}M</td>
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
      )}
    </div>
  )
}
