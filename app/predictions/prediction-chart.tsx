"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface PredictionChartProps {
  predictions: any[]
}

export function PredictionChart({ predictions }: PredictionChartProps) {
  const chartData = predictions.slice(0, 30).map((p) => ({
    date: new Date(p.prediction_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: Number(p.predicted_price),
    demand: p.predicted_demand,
  }))

  if (chartData.length === 0) {
    return <div className="h-[300px] flex items-center justify-center text-slate-500">No prediction data available</div>
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
          <XAxis dataKey="date" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
            }}
            formatter={(value: any, name: string) => [`$${value}`, "Predicted Price"]}
          />
          <Area type="monotone" dataKey="price" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
