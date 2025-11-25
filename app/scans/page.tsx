import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Play, Pause, Clock, Calendar, Zap, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { RunScanButton } from "./run-scan-button"
import { BatchScanButton } from "./batch-scan-button"

export default async function ScansPage() {
  const supabase = await createClient()

  const { data: scanConfigs } = await supabase
    .from("scan_configs")
    .select(`*, hotels (name, base_price, location)`)
    .order("created_at", { ascending: false })

  const { data: recentScans } = await supabase
    .from("scans")
    .select(`*, scan_configs (hotel_id, hotels (name))`)
    .order("started_at", { ascending: false })
    .limit(10)

  const { data: recentResults } = await supabase
    .from("scan_results")
    .select("*")
    .order("scraped_at", { ascending: false })
    .limit(20)

  // Calculate stats
  const activeConfigs = scanConfigs?.filter((c) => c.is_active).length || 0
  const completedScans = recentScans?.filter((s) => s.status === "completed").length || 0
  const avgPrice = recentResults?.length
    ? recentResults.reduce((sum, r) => sum + Number(r.price), 0) / recentResults.length
    : 0

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Price Scanner
          </h1>
          <p className="text-muted-foreground">Real-time competitor price monitoring and market analysis</p>
        </div>
        <div className="flex gap-3">
          <BatchScanButton />
          <Link href="/scans/new">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Scan Config
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Monitors</p>
                <p className="text-3xl font-bold text-cyan-400">{activeConfigs}</p>
              </div>
              <Zap className="h-8 w-8 text-cyan-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scans Today</p>
                <p className="text-3xl font-bold text-green-400">{completedScans}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Avg Price</p>
                <p className="text-3xl font-bold text-purple-400">${avgPrice.toFixed(0)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sources Tracked</p>
                <p className="text-3xl font-bold text-orange-400">6</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-cyan-500" />
                Active Configurations
              </CardTitle>
              <CardDescription>Scheduled price monitoring tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {!scanConfigs || scanConfigs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No scan configurations</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a scan configuration to start monitoring competitor prices
                  </p>
                  <Link href="/scans/new">
                    <Button>Create First Scan</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {scanConfigs.map((config: any) => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${config.is_active ? "bg-green-500/20" : "bg-muted"}`}>
                          {config.is_active ? (
                            <Play className="h-4 w-4 text-green-500" />
                          ) : (
                            <Pause className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{config.hotels?.name || "Unknown Hotel"}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            {new Date(config.check_in_date).toLocaleDateString()} -{" "}
                            {new Date(config.check_out_date).toLocaleDateString()}
                            {config.hotels?.location && (
                              <span className="ml-2 text-cyan-500">• {config.hotels.location}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={config.is_active ? "default" : "secondary"}>{config.frequency}</Badge>
                        <RunScanButton configId={config.id} hotelName={config.hotels?.name} />
                        <Link href={`/scans/${config.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader>
              <CardTitle>Latest Price Data</CardTitle>
              <CardDescription>Most recent competitor prices collected</CardDescription>
            </CardHeader>
            <CardContent>
              {!recentResults || recentResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No price data yet. Run a scan to collect competitor prices.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Source</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Price</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Room Type</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-2 px-3 text-sm font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentResults.slice(0, 10).map((result: any) => (
                        <tr key={result.id} className="border-b border-border/50">
                          <td className="py-2 px-3 font-medium">{result.source}</td>
                          <td className="py-2 px-3">
                            <span className="text-cyan-400 font-mono">${Number(result.price).toFixed(2)}</span>
                          </td>
                          <td className="py-2 px-3 text-sm text-muted-foreground">{result.room_type}</td>
                          <td className="py-2 px-3">
                            <Badge variant={result.availability ? "default" : "destructive"}>
                              {result.availability ? "Available" : "Sold Out"}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-sm text-muted-foreground">
                            {new Date(result.scraped_at).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
              <CardDescription>Latest scan executions</CardDescription>
            </CardHeader>
            <CardContent>
              {!recentScans || recentScans.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No scans executed yet</p>
              ) : (
                <div className="space-y-3">
                  {recentScans.map((scan: any) => (
                    <div key={scan.id} className="p-3 bg-accent/50 rounded-lg">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{scan.scan_configs?.hotels?.name || "Manual Scan"}</span>
                        <Badge
                          variant={
                            scan.status === "completed"
                              ? "default"
                              : scan.status === "failed"
                                ? "destructive"
                                : scan.status === "running"
                                  ? "secondary"
                                  : "outline"
                          }
                          className={scan.status === "completed" ? "bg-green-500/20 text-green-400" : ""}
                        >
                          {scan.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{new Date(scan.started_at).toLocaleString()}</div>
                      {scan.completed_at && (
                        <div className="text-xs text-cyan-500 mt-1">
                          Duration:{" "}
                          {Math.round(
                            (new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime()) / 1000,
                          )}
                          s
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>Monitored booking platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {["Booking.com", "Expedia", "Hotels.com", "Agoda", "Trip.com", "Direct Website"].map((source) => (
                  <div key={source} className="flex items-center justify-between p-2 rounded-lg bg-accent/30">
                    <span className="text-sm font-medium">{source}</span>
                    <Badge variant="outline" className="text-green-400 border-green-400/50">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
