import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Clock, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { RunScanButton } from "../run-scan-button"

export default async function ScanDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Get scan config with hotel info
  const { data: scanConfig } = await supabase
    .from("scan_configs")
    .select(`*, hotels (id, name, base_price, location)`)
    .eq("id", id)
    .single()

  if (!scanConfig) {
    notFound()
  }

  // Get scan history for this config
  const { data: scans } = await supabase
    .from("scans")
    .select("*")
    .eq("config_id", id)
    .order("started_at", { ascending: false })
    .limit(20)

  // Get scan results for these scans
  const scanIds = scans?.map((s) => s.id) || []
  const { data: scanResults } = await supabase
    .from("scan_results")
    .select("*")
    .in("scan_id", scanIds.length > 0 ? scanIds : ["none"])
    .order("scraped_at", { ascending: false })

  // Get daily prices for this hotel
  const { data: dailyPrices } = await supabase
    .from("daily_prices")
    .select("*")
    .eq("hotel_id", scanConfig.hotel_id)
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })
    .limit(30)

  // Calculate statistics
  const avgOurPrice = dailyPrices?.length
    ? dailyPrices.reduce((sum, d) => sum + Number(d.our_price || 0), 0) / dailyPrices.length
    : scanConfig.hotels?.base_price || 0

  const avgCompetitorPrice = dailyPrices?.length
    ? dailyPrices.reduce((sum, d) => sum + Number(d.avg_competitor_price || 0), 0) / dailyPrices.length
    : 0

  const priceDiff = avgCompetitorPrice > 0 ? ((avgOurPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100 : 0

  // Group results by source
  const resultsBySource: Record<string, any[]> = {}
  scanResults?.forEach((result) => {
    if (!resultsBySource[result.source]) {
      resultsBySource[result.source] = []
    }
    resultsBySource[result.source].push(result)
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/scans">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {scanConfig.hotels?.name || "Scan Configuration"}
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <Calendar className="h-4 w-4" />
            {new Date(scanConfig.check_in_date).toLocaleDateString()} -{" "}
            {new Date(scanConfig.check_out_date).toLocaleDateString()}
            {scanConfig.hotels?.location && <span className="ml-2">• {scanConfig.hotels.location}</span>}
          </p>
        </div>
        <div className="flex gap-3">
          <Badge variant={scanConfig.is_active ? "default" : "secondary"} className="h-8 px-4">
            {scanConfig.is_active ? "Active" : "Paused"}
          </Badge>
          <RunScanButton configId={scanConfig.id} hotelName={scanConfig.hotels?.name} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Your Avg Price</p>
            <p className="text-3xl font-bold text-cyan-400">${avgOurPrice.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Competitor Avg</p>
            <p className="text-3xl font-bold text-purple-400">
              {avgCompetitorPrice > 0 ? `$${avgCompetitorPrice.toFixed(0)}` : "N/A"}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`bg-gradient-to-br ${priceDiff > 0 ? "from-red-500/10 to-orange-500/10 border-red-500/20" : "from-green-500/10 to-emerald-500/10 border-green-500/20"}`}
        >
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Price Position</p>
            <div className="flex items-center gap-2">
              {priceDiff > 0 ? (
                <TrendingUp className="h-6 w-6 text-red-400" />
              ) : priceDiff < 0 ? (
                <TrendingDown className="h-6 w-6 text-green-400" />
              ) : (
                <Minus className="h-6 w-6 text-gray-400" />
              )}
              <p
                className={`text-3xl font-bold ${priceDiff > 0 ? "text-red-400" : priceDiff < 0 ? "text-green-400" : "text-gray-400"}`}
              >
                {priceDiff > 0 ? "+" : ""}
                {priceDiff.toFixed(1)}%
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Scans</p>
            <p className="text-3xl font-bold text-blue-400">{scans?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily Prices */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily Price Comparison</CardTitle>
              <CardDescription>Your prices vs competitor average for the next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {!dailyPrices || dailyPrices.length === 0 ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No price data yet</h3>
                  <p className="text-muted-foreground mb-4">Run a scan from the Calendar page to collect price data</p>
                  <Link href="/calendar">
                    <Button>Go to Calendar</Button>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Date</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Your Price</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">
                          Competitor Avg
                        </th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Recommended</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Demand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyPrices.map((day: any) => {
                        const diff = day.avg_competitor_price
                          ? ((Number(day.our_price) - Number(day.avg_competitor_price)) /
                              Number(day.avg_competitor_price)) *
                            100
                          : 0
                        return (
                          <tr key={day.id} className="border-b border-border/50 hover:bg-accent/30">
                            <td className="py-2 px-3 font-medium">
                              {new Date(day.date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-cyan-400 font-mono">${Number(day.our_price).toFixed(0)}</span>
                            </td>
                            <td className="py-2 px-3">
                              {day.avg_competitor_price ? (
                                <span className="text-purple-400 font-mono">
                                  ${Number(day.avg_competitor_price).toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {day.recommended_price ? (
                                <span className="text-green-400 font-mono">
                                  ${Number(day.recommended_price).toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <Badge
                                variant="outline"
                                className={
                                  day.demand_level === "peak"
                                    ? "border-red-500 text-red-400"
                                    : day.demand_level === "high"
                                      ? "border-orange-500 text-orange-400"
                                      : day.demand_level === "medium"
                                        ? "border-yellow-500 text-yellow-400"
                                        : "border-gray-500 text-gray-400"
                                }
                              >
                                {day.demand_level || "unknown"}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scan History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Scan History</CardTitle>
              <CardDescription>Recent scan executions</CardDescription>
            </CardHeader>
            <CardContent>
              {!scans || scans.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No scans executed yet</p>
              ) : (
                <div className="space-y-3">
                  {scans.map((scan: any) => (
                    <div key={scan.id} className="p-3 bg-accent/50 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(scan.started_at).toLocaleString()}
                        </span>
                        <Badge
                          variant={
                            scan.status === "completed"
                              ? "default"
                              : scan.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className={scan.status === "completed" ? "bg-green-500/20 text-green-400" : ""}
                        >
                          {scan.status}
                        </Badge>
                      </div>
                      {scan.completed_at && (
                        <div className="flex items-center gap-2 text-xs text-cyan-500">
                          <Clock className="h-3 w-3" />
                          {Math.round(
                            (new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000,
                          )}
                          s
                        </div>
                      )}
                      {scan.error_message && <p className="text-xs text-red-400 mt-1">{scan.error_message}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results by Source */}
          <Card>
            <CardHeader>
              <CardTitle>Price by Source</CardTitle>
              <CardDescription>Latest prices from each platform</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(resultsBySource).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No results yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(resultsBySource).map(([source, results]) => {
                    const latestResult = results[0]
                    return (
                      <div key={source} className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
                        <div>
                          <p className="font-medium">{source}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(latestResult.scraped_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-cyan-400">${Number(latestResult.price).toFixed(0)}</p>
                          <Badge variant={latestResult.availability ? "outline" : "destructive"} className="text-xs">
                            {latestResult.availability ? "Available" : "Sold Out"}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
