import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDaysIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  AlertCircleIcon,
  ClockIcon,
  BedDoubleIcon,
} from "@/components/icons"
import { CalendarGrid } from "./calendar-grid"
import { RunScraperButton } from "./run-scraper-button"

export default async function CalendarPage() {
  const supabase = await createClient()

  const { data: hotels } = await supabase.from("hotels").select("*").order("name")

  const { data: roomTypes } = await supabase
    .from("hotel_room_types")
    .select("*, hotels(name)")
    .eq("is_active", true)
    .order("name")

  const { data: competitors } = await supabase.from("hotel_competitors").select("*").eq("is_active", true)

  const { data: competitorRoomTypes } = await supabase
    .from("competitor_room_types")
    .select("*, hotel_competitors(competitor_hotel_name)")
    .eq("is_active", true)
    .order("name")

  const today = new Date()
  const futureDate = new Date(today)
  futureDate.setDate(futureDate.getDate() + 180)

  const { data: dailyPrices } = await supabase
    .from("daily_prices")
    .select("*, hotels(name)")
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", futureDate.toISOString().split("T")[0])
    .order("date")

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .gte("check_in_date", today.toISOString().split("T")[0])
    .lte("check_in_date", futureDate.toISOString().split("T")[0])
    .eq("status", "confirmed")
    .order("check_in_date")

  const { data: scanResults } = await supabase
    .from("scan_results")
    .select("*")
    .order("scraped_at", { ascending: false })

  const { data: competitorDailyPrices } = await supabase
    .from("competitor_daily_prices")
    .select("*, hotel_competitors(competitor_hotel_name, display_color), competitor_room_types(name)")
    .gte("date", today.toISOString().split("T")[0])
    .lte("date", futureDate.toISOString().split("T")[0])
    .order("date")

  const increaseCount = dailyPrices?.filter((p) => p.autopilot_action === "increase").length || 0
  const decreaseCount = dailyPrices?.filter((p) => p.autopilot_action === "decrease").length || 0
  const maintainCount = dailyPrices?.filter((p) => p.autopilot_action === "maintain").length || 0

  const totalBookings = bookings?.length || 0
  const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0

  const firstHotel = hotels?.[0]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
              <CalendarDaysIcon className="h-8 w-8 text-cyan-400" />
            </div>
            Price Calendar
          </h1>
          <p className="text-muted-foreground mt-1">180-day price comparison with competitors and occupancy data</p>
        </div>
        <div className="flex items-center gap-4">
          {firstHotel && <RunScraperButton hotelId={firstHotel.id} hotelName={firstHotel.name} />}
          <Badge variant="outline" className="flex items-center gap-2 px-3 py-1">
            <ClockIcon className="h-4 w-4" />
            Auto-scan every 5 hours
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Days Analyzed</CardDescription>
            <CardTitle className="text-2xl">{dailyPrices?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50 border-green-500/30">
          <CardHeader className="pb-2">
            <CardDescription>Increase Recommendations</CardDescription>
            <CardTitle className="text-2xl text-green-500 flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              {increaseCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50 border-red-500/30">
          <CardHeader className="pb-2">
            <CardDescription>Decrease Recommendations</CardDescription>
            <CardTitle className="text-2xl text-red-500 flex items-center gap-2">
              <TrendingDownIcon className="h-5 w-5" />
              {decreaseCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50 border-cyan-500/30">
          <CardHeader className="pb-2">
            <CardDescription>Optimal Prices</CardDescription>
            <CardTitle className="text-2xl text-cyan-400 flex items-center gap-2">
              <MinusIcon className="h-5 w-5" />
              {maintainCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardDescription>Future Bookings</CardDescription>
            <CardTitle className="text-2xl text-purple-400 flex items-center gap-2">
              <BedDoubleIcon className="h-5 w-5" />
              {totalBookings}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500" />
            <span className="text-sm">Increase price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500" />
            <span className="text-sm">Decrease price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-cyan-500/20 border border-cyan-500" />
            <span className="text-sm">Price optimal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500" />
            <span className="text-sm">Has bookings</span>
          </div>
          <div className="border-l border-border/50 pl-4 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Competitors:</span>
            {competitors && competitors.length > 0 ? (
              competitors.slice(0, 6).map((comp, index) => (
                <div key={comp.id} className="flex items-center gap-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        comp.display_color ||
                        ["#f97316", "#8b5cf6", "#22c55e", "#ec4899", "#eab308", "#3b82f6"][index % 6],
                    }}
                  />
                  <span className="text-xs">{comp.competitor_hotel_name}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No competitors</span>
            )}
          </div>
        </CardContent>
      </Card>

      {hotels && hotels.length > 0 ? (
        <CalendarGrid
          hotels={hotels}
          dailyPrices={dailyPrices || []}
          roomTypes={roomTypes || []}
          competitors={competitors || []}
          competitorRoomTypes={competitorRoomTypes || []}
          competitorDailyPrices={competitorDailyPrices || []}
          bookings={bookings || []}
          scanResults={scanResults || []}
        />
      ) : (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="py-12 text-center">
            <AlertCircleIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hotels found</h3>
            <p className="text-muted-foreground">Add hotels first to see price calendar</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
