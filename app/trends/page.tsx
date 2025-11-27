import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUpIcon, TrendingDownIcon, ActivityIcon, ZapIcon } from "@/components/icons"
import { AnalyzeTrendsButton } from "./analyze-button"

export default async function TrendsPage() {
  const supabase = await createClient()

  const { data: trends } = await supabase
    .from("market_trends")
    .select("*, hotels(name)")
    .order("detected_at", { ascending: false })
    .limit(50)

  const getTrendIcon = (type: string) => {
    switch (type) {
      case "price_increase":
        return <TrendingUpIcon className="h-5 w-5 text-green-600" />
      case "price_decrease":
        return <TrendingDownIcon className="h-5 w-5 text-red-600" />
      case "demand_spike":
        return <ZapIcon className="h-5 w-5 text-yellow-600" />
      default:
        return <ActivityIcon className="h-5 w-5 text-blue-600" />
    }
  }

  const getTrendBadge = (type: string) => {
    switch (type) {
      case "price_increase":
        return <Badge className="bg-green-100 text-green-800">Price Up</Badge>
      case "price_decrease":
        return <Badge className="bg-red-100 text-red-800">Price Down</Badge>
      case "demand_spike":
        return <Badge className="bg-yellow-100 text-yellow-800">Demand Spike</Badge>
      default:
        return <Badge variant="secondary">{type}</Badge>
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Market Trends</h1>
          <p className="text-slate-600 dark:text-slate-400">AI-detected patterns and market movements</p>
        </div>
        <AnalyzeTrendsButton />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <TrendingUpIcon className="h-5 w-5" />
              <span className="font-medium">Price Increases</span>
            </div>
            <div className="text-3xl font-bold">
              {trends?.filter((t: any) => t.trend_type === "price_increase").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <TrendingDownIcon className="h-5 w-5" />
              <span className="font-medium">Price Decreases</span>
            </div>
            <div className="text-3xl font-bold">
              {trends?.filter((t: any) => t.trend_type === "price_decrease").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
              <ZapIcon className="h-5 w-5" />
              <span className="font-medium">Demand Spikes</span>
            </div>
            <div className="text-3xl font-bold">
              {trends?.filter((t: any) => t.trend_type === "demand_spike").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Trends</CardTitle>
          <CardDescription>Market movements detected by our AI analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {!trends || trends.length === 0 ? (
            <div className="text-center py-16">
              <ActivityIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">No trends detected yet</h3>
              <p className="text-slate-500 mb-4">Run a trend analysis to detect market patterns</p>
              <AnalyzeTrendsButton />
            </div>
          ) : (
            <div className="space-y-4">
              {trends.map((trend: any) => (
                <div key={trend.id} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                  {getTrendIcon(trend.trend_type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{trend.hotels?.name || "Unknown Hotel"}</span>
                      {getTrendBadge(trend.trend_type)}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{trend.description}</p>
                    <span className="text-xs text-slate-500">{new Date(trend.detected_at).toLocaleString()}</span>
                  </div>
                  {trend.percentage_change && (
                    <div
                      className={`text-xl font-bold ${trend.percentage_change > 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {trend.percentage_change > 0 ? "+" : ""}
                      {trend.percentage_change}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
