"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"

interface HotelPriceChartProps {
  scanResults: any[]
  competitorData: any[]
  basePrice: number
}

export function HotelPriceChart({ scanResults, competitorData, basePrice }: HotelPriceChartProps) {
  // Process data for chart
  const chartData = (() => {
    const dataByDate: Record<
      string,
      { date: string; yourPrice: number; competitorAvg: number; count: number; compCount: number }
    > = {}

    scanResults.forEach((result: any) => {
      const date = new Date(result.scraped_at).toISOString().split("T")[0]
      if (!dataByDate[date]) {
        dataByDate[date] = { date, yourPrice: 0, competitorAvg: 0, count: 0, compCount: 0 }
      }
      dataByDate[date].yourPrice += Number(result.price)
      dataByDate[date].count++
    })

    competitorData.forEach((comp: any) => {
      const date = new Date(comp.scraped_at).toISOString().split("T")[0]
      if (dataByDate[date]) {
        dataByDate[date].competitorAvg += Number(comp.price)
        dataByDate[date].compCount++
      }
    })

    return Object.values(dataByDate)
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        yourPrice: d.count > 0 ? Math.round(d.yourPrice / d.count) : null,
        competitorAvg: d.compCount > 0 ? Math.round(d.competitorAvg / d.compCount) : null,
      }))
      .slice(-14)
      .reverse()
  })()

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">No price data available</div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="date" className="text-xs" />
        <YAxis className="text-xs" domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
          }}
          formatter={(value: any) => [`$${value}`, ""]}
        />
        <Legend />
        <ReferenceLine y={basePrice} stroke="hsl(var(--primary))" strokeDasharray="5 5" label="Base" />
        <Line
          type="monotone"
          dataKey="yourPrice"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          name="Your Price"
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="competitorAvg"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Competitor Avg"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
