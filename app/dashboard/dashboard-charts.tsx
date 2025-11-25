"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts"

interface DashboardChartsProps {
  scanResults: any[]
  predictions: any[]
  revenue: any[]
}

export function DashboardCharts({ scanResults, predictions, revenue }: DashboardChartsProps) {
  // Process scan results for price history chart
  const priceHistory = scanResults
    .slice(0, 30)
    .reverse()
    .map((r, i) => ({
      date: new Date(r.scraped_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      price: Number(r.price),
      source: r.source,
    }))

  // Process predictions for forecast chart
  const forecastData = predictions.map((p) => ({
    date: new Date(p.prediction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    predicted: Number(p.predicted_price),
    demand: p.predicted_demand,
    confidence: p.confidence_score ? p.confidence_score * 100 : 50,
  }))

  // Process revenue data
  const revenueData = revenue
    .slice(0, 14)
    .reverse()
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: Number(r.revenue || 0),
      bookings: r.bookings || 0,
      occupancy: Number(r.occupancy_rate || 0),
    }))

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Price History & Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="history">
            <TabsList className="mb-4">
              <TabsTrigger value="history">Price History</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              <div className="h-[300px]">
                {priceHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No price data available yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>
            <TabsContent value="forecast">
              <div className="h-[300px]">
                {forecastData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No predictions available yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                      <Area type="monotone" dataKey="predicted" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Revenue & Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            {revenueData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                No revenue data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenue ($)" />
                  <Bar yAxisId="right" dataKey="occupancy" fill="#f59e0b" name="Occupancy (%)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
