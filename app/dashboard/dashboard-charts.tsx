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
  ComposedChart,
} from "recharts"

interface DashboardChartsProps {
  scanResults: any[]
  predictions: any[]
  revenue: any[]
  dailyPrices?: any[] // Added dailyPrices prop
}

export function DashboardCharts({ scanResults, predictions, revenue, dailyPrices = [] }: DashboardChartsProps) {
  const calendarData = dailyPrices.slice(0, 30).map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    ourPrice: Number(d.our_price || 0),
    competitorAvg: Number(d.avg_competitor_price || 0),
    recommended: Number(d.recommended_price || 0),
    minComp: Number(d.min_competitor_price || 0),
    maxComp: Number(d.max_competitor_price || 0),
    demand: d.demand_level,
  }))

  // Process scan results for price history chart
  const priceHistory = scanResults
    .slice(0, 30)
    .reverse()
    .map((r) => ({
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
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Price Comparison (Next 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {calendarData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                No calendar data - run a scan first
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={calendarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="maxComp"
                    fill="#334155"
                    stroke="none"
                    name="Competitor Range"
                    fillOpacity={0.3}
                  />
                  <Area type="monotone" dataKey="minComp" fill="#0f172a" stroke="none" fillOpacity={1} />
                  <Line
                    type="monotone"
                    dataKey="ourPrice"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    dot={{ fill: "#22d3ee", strokeWidth: 2 }}
                    name="Our Price"
                  />
                  <Line
                    type="monotone"
                    dataKey="competitorAvg"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Competitor Avg"
                  />
                  <Line
                    type="monotone"
                    dataKey="recommended"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Recommended"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Revenue & Occupancy Chart */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Revenue & Occupancy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {revenueData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500">
                No revenue data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="revenue" fill="#22d3ee" name="Revenue ($)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="occupancy" fill="#a855f7" name="Occupancy (%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Price History & Predictions */}
      <Card className="bg-slate-900/50 border-slate-800 lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white">Price History & AI Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="history">
            <TabsList className="mb-4 bg-slate-800">
              <TabsTrigger value="history" className="data-[state=active]:bg-cyan-500">
                Price History
              </TabsTrigger>
              <TabsTrigger value="forecast" className="data-[state=active]:bg-cyan-500">
                AI Forecast
              </TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              <div className="h-[250px]">
                {priceHistory.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No price history data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        dot={{ fill: "#22d3ee", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>
            <TabsContent value="forecast">
              <div className="h-[250px]">
                {forecastData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No predictions available - generate predictions first
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#fff" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="predicted"
                        stroke="#a855f7"
                        fill="#a855f7"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
