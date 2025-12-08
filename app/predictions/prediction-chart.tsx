"use client"

import { useState } from "react"
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
  Bar,
} from "recharts"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon, RefreshCwIcon } from "@/components/icons"

interface PredictionChartProps {
  predictions: any[]
  competitorPrices?: any[]
}

export function PredictionChart({ predictions, competitorPrices = [] }: PredictionChartProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { month: now.getMonth(), year: now.getFullYear() }
  })
  const [isGenerating, setIsGenerating] = useState(false)

  // Filter predictions for selected month
  const filteredPredictions = predictions.filter((p) => {
    const date = new Date(p.prediction_date)
    return date.getMonth() === selectedMonth.month && date.getFullYear() === selectedMonth.year
  })

  // Get competitor average for each date
  const competitorByDate: Record<string, { booking: number[]; expedia: number[] }> = {}
  competitorPrices?.forEach((cp) => {
    const dateStr = cp.date
    if (!competitorByDate[dateStr]) {
      competitorByDate[dateStr] = { booking: [], expedia: [] }
    }
    if (cp.source?.toLowerCase().includes("booking")) {
      competitorByDate[dateStr].booking.push(Number(cp.price))
    } else if (cp.source?.toLowerCase().includes("expedia")) {
      competitorByDate[dateStr].expedia.push(Number(cp.price))
    }
  })

  const chartData = filteredPredictions.map((p) => {
    const compData = competitorByDate[p.prediction_date]
    const bookingAvg = compData?.booking.length
      ? Math.round(compData.booking.reduce((a, b) => a + b, 0) / compData.booking.length)
      : null
    const expediaAvg = compData?.expedia.length
      ? Math.round(compData.expedia.reduce((a, b) => a + b, 0) / compData.expedia.length)
      : null

    return {
      date: new Date(p.prediction_date).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
      fullDate: p.prediction_date,
      price: Number(p.predicted_price),
      demand: p.predicted_demand,
      confidence: Math.round((p.confidence_score || 0) * 100),
      occupancy: p.factors?.occupancy_rate || 0,
      bookingAvg,
      expediaAvg,
    }
  })

  const navigateMonth = (direction: number) => {
    setSelectedMonth((prev) => {
      let newMonth = prev.month + direction
      let newYear = prev.year
      if (newMonth > 11) {
        newMonth = 0
        newYear++
      } else if (newMonth < 0) {
        newMonth = 11
        newYear--
      }
      return { month: newMonth, year: newYear }
    })
  }

  const generatePredictionsForMonth = async () => {
    setIsGenerating(true)
    try {
      console.log(
        "[v0] generatePredictionsForMonth - selectedMonth:",
        selectedMonth,
        "sending month:",
        selectedMonth.month + 1,
        "year:",
        selectedMonth.year,
      )

      const response = await fetch("/api/predictions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          months: [selectedMonth.month + 1], // API expects 1-indexed months
          year: selectedMonth.year,
          daysAhead: 35, // A bit more than a month to cover edges
          analysisParams: {
            includeCompetitors: true,
            includeSeasonality: true,
            includeEvents: true,
            includeOccupancy: true,
            includeBudget: true,
            includeFutureBookings: true,
            includeMarketTrends: true,
          },
          // hotelIds will be auto-fetched by API if not provided
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Generated predictions:", data)
        // Refresh the page to show new predictions
        window.location.reload()
      } else {
        const error = await response.json()
        console.error("[v0] Failed to generate predictions:", error)
        alert("שגיאה ביצירת חיזויים: " + (error.error || "Unknown error"))
      }
    } catch (error) {
      console.error("[v0] Error generating predictions:", error)
      alert("שגיאה ביצירת חיזויים")
    } finally {
      setIsGenerating(false)
    }
  }

  const monthNames = [
    "ינואר",
    "פברואר",
    "מרץ",
    "אפריל",
    "מאי",
    "יוני",
    "יולי",
    "אוגוסט",
    "ספטמבר",
    "אוקטובר",
    "נובמבר",
    "דצמבר",
  ]

  if (predictions.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 gap-4">
        <SparklesIcon className="h-12 w-12 text-slate-400" />
        <p>No prediction data available</p>
        <Button
          onClick={generatePredictionsForMonth}
          disabled={isGenerating}
          className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
        >
          {isGenerating ? (
            <>
              <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
              מייצר חיזויים...
            </>
          ) : (
            <>
              <SparklesIcon className="h-4 w-4 mr-2" />
              צור חיזויים
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <div className="text-lg font-semibold min-w-[150px] text-center">
          {monthNames[selectedMonth.month]} {selectedMonth.year}
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Chart */}
      <div className="h-[350px]">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
            <SparklesIcon className="h-12 w-12 text-slate-400" />
            <p>
              אין חיזויים לחודש {monthNames[selectedMonth.month]} {selectedMonth.year}
            </p>
            <Button
              onClick={generatePredictionsForMonth}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700"
            >
              {isGenerating ? (
                <>
                  <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                  מייצר חיזויים...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  צור חיזויים ל{monthNames[selectedMonth.month]} {selectedMonth.year}
                </>
              )}
            </Button>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: any, name: string) => {
                  const labels: Record<string, string> = {
                    price: "מחיר מומלץ",
                    bookingAvg: "ממוצע Booking",
                    expediaAvg: "ממוצע Expedia",
                    occupancy: "תפוסה",
                  }
                  if (name === "occupancy") return [`${value}%`, labels[name]]
                  return [`₪${value}`, labels[name] || name]
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="price"
                name="מחיר מומלץ"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="bookingAvg"
                name="ממוצע Booking"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="expediaAvg"
                name="ממוצע Expedia"
                stroke="#eab308"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
              <Bar dataKey="occupancy" name="תפוסה %" fill="#22c55e" fillOpacity={0.2} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stats Summary */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">מחיר ממוצע מומלץ</div>
            <div className="text-xl font-bold text-purple-500">
              ₪{Math.round(chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">ממוצע Booking</div>
            <div className="text-xl font-bold text-blue-500">
              ₪
              {Math.round(
                chartData.filter((d) => d.bookingAvg).reduce((sum, d) => sum + (d.bookingAvg || 0), 0) /
                  (chartData.filter((d) => d.bookingAvg).length || 1),
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">ממוצע Expedia</div>
            <div className="text-xl font-bold text-yellow-500">
              ₪
              {Math.round(
                chartData.filter((d) => d.expediaAvg).reduce((sum, d) => sum + (d.expediaAvg || 0), 0) /
                  (chartData.filter((d) => d.expediaAvg).length || 1),
              )}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">תפוסה ממוצעת</div>
            <div className="text-xl font-bold text-green-500">
              {Math.round(chartData.reduce((sum, d) => sum + d.occupancy, 0) / chartData.length)}%
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
