import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"
import { CalendarGrid } from "./calendar-grid"
import { GenerateCalendarButton } from "./generate-calendar-button"

export default async function CalendarPage() {
  const supabase = await createClient()

  // Get hotels
  const { data: hotels } = await supabase.from("hotels").select("*").order("name")

  // Get daily prices for next 60 days
  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + 60)

  const { data: dailyPrices } = await supabase
    .from("daily_prices")
    .select("*, hotels(name)")
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", futureDate.toISOString().split("T")[0])
    .order("date")

  // Calculate summary stats
  const pricesWithRecommendation =
    dailyPrices?.filter((p) => p.recommended_price && p.our_price && p.recommended_price !== p.our_price) || []
  const increaseSuggestions = pricesWithRecommendation.filter((p) => p.recommended_price > p.our_price).length
  const decreaseSuggestions = pricesWithRecommendation.filter((p) => p.recommended_price < p.our_price).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
              <CalendarDays className="h-8 w-8 text-cyan-400" />
            </div>
            Price Calendar
          </h1>
          <p className="text-muted-foreground mt-1">Daily price comparison with competitors and AI recommendations</p>
        </div>
        <GenerateCalendarButton hotels={hotels || []} />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Days Analyzed</CardDescription>
            <CardTitle className="text-2xl">{dailyPrices?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Price Increase Suggestions</CardDescription>
            <CardTitle className="text-2xl text-green-500 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {increaseSuggestions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Price Decrease Suggestions</CardDescription>
            <CardTitle className="text-2xl text-red-500 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              {decreaseSuggestions}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Optimal Prices</CardDescription>
            <CardTitle className="text-2xl text-cyan-400 flex items-center gap-2">
              <Minus className="h-5 w-5" />
              {(dailyPrices?.length || 0) - pricesWithRecommendation.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Legend */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500" />
            <span className="text-sm">Increase price recommended</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500" />
            <span className="text-sm">Decrease price recommended</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cyan-500/20 border border-cyan-500" />
            <span className="text-sm">Price is optimal</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500">
              Peak
            </Badge>
            <span className="text-sm">High demand day</span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      {hotels && hotels.length > 0 ? (
        <CalendarGrid hotels={hotels} dailyPrices={dailyPrices || []} />
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hotels found</h3>
            <p className="text-muted-foreground">Add hotels first to see price calendar</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
