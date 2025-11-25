"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts"

interface AnalyticsChartsProps {
  scanResults: any[]
  competitorData: any[]
  revenue: any[]
  predictions: any[]
}

export function AnalyticsCharts({ scanResults, competitorData, revenue, predictions }: AnalyticsChartsProps) {
  // Process price comparison data (your prices vs competitors)
  const priceComparisonData = (() => {
    const last30Days: Record<string, { date: string; yourPrice: number; competitorAvg: number; count: number }> = {}

    scanResults.forEach((result: any) => {
      const date = new Date(result.scraped_at).toISOString().split("T")[0]
      if (!last30Days[date]) {
        last30Days[date] = { date, yourPrice: 0, competitorAvg: 0, count: 0 }
      }
      last30Days[date].yourPrice += Number(result.price)
      last30Days[date].count++
    })

    competitorData.forEach((comp: any) => {
      const date = new Date(comp.scraped_at).toISOString().split("T")[0]
      if (last30Days[date]) {
        last30Days[date].competitorAvg += Number(comp.price)
      }
    })

    return Object.values(last30Days)
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        yourPrice: d.count > 0 ? Math.round(d.yourPrice / d.count) : 0,
        competitorAvg: d.count > 0 ? Math.round(d.competitorAvg / d.count) : 0,
      }))
      .slice(-14)
      .reverse()
  })()

  // Process revenue data
  const revenueData = revenue
    .slice(0, 30)
    .reverse()
    .map((r: any) => ({
      date: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: Number(r.revenue || 0),
      bookings: Number(r.bookings || 0),
      occupancy: Number(r.occupancy_rate || 0),
    }))

  // Process predictions data
  const predictionsData = predictions.slice(0, 14).map((p: any) => ({
    date: new Date(p.prediction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    predicted: Number(p.predicted_price),
    confidence: Number(p.confidence_score || 0.8) * 100,
    demand: p.predicted_demand,
  }))

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Price Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Prices vs Market</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceComparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="yourPrice"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="Your Price"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="competitorAvg"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Competitor Avg"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue & Occupancy Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue & Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="revenue"
                fill="hsl(var(--primary))"
                name="Revenue ($)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="occupancy"
                stroke="hsl(142 76% 36%)"
                strokeWidth={2}
                name="Occupancy (%)"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Price Predictions Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Price Predictions (Next 14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={predictionsData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
                formatter={(value: any, name: string) => {
                  if (name === "Predicted Price") return [`$${value}`, name]
                  if (name === "Confidence") return [`${value}%`, name]
                  return [value, name]
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.2}
                strokeWidth={2}
                name="Predicted Price"
              />
              <Area
                type="monotone"
                dataKey="confidence"
                stroke="hsl(142 76% 36%)"
                fill="hsl(142 76% 36%)"
                fillOpacity={0.1}
                strokeWidth={1}
                strokeDasharray="3 3"
                name="Confidence"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
