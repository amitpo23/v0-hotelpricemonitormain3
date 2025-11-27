"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DollarSignIcon,
  AlertTriangleIcon,
  BuildingIcon,
} from "@/components/icons"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns"
import { RunScraperButton } from "./run-scraper-button"

interface CalendarGridProps {
  hotels: any[]
  dailyPrices: any[]
  roomTypes: any[]
  competitors: any[]
}

export function CalendarGrid({ hotels, dailyPrices, roomTypes, competitors }: CalendarGridProps) {
  const [selectedHotel, setSelectedHotel] = useState<string>(hotels[0]?.id || "")
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [competitorPrices, setCompetitorPrices] = useState<any[]>([])
  const [loadingCompetitors, setLoadingCompetitors] = useState(false)

  const hotelRoomTypes = roomTypes.filter((rt) => rt.hotel_id === selectedHotel)
  const hotelCompetitors = competitors.filter((c) => c.hotel_id === selectedHotel)

  useEffect(() => {
    if (selectedHotel && selectedDay) {
      fetchCompetitorDetails()
    }
  }, [selectedHotel, selectedDay, selectedRoomType])

  const fetchCompetitorDetails = async () => {
    if (!selectedHotel || !selectedDay) return
    setLoadingCompetitors(true)
    try {
      const roomTypeParam = selectedRoomType !== "all" ? `&roomTypeId=${selectedRoomType}` : ""
      const res = await fetch(
        `/api/competitors/prices?hotelId=${selectedHotel}&date=${selectedDay.date}${roomTypeParam}`,
      )
      const data = await res.json()
      setCompetitorPrices(data.prices || [])
    } catch (error) {
      console.error("Error fetching competitor details:", error)
    }
    setLoadingCompetitors(false)
  }

  const selectedHotelData = hotels.find((h) => h.id === selectedHotel)

  const hotelPrices = dailyPrices.filter((p) => {
    if (p.hotel_id !== selectedHotel) return false
    if (selectedRoomType !== "all" && p.room_type_id && p.room_type_id !== selectedRoomType) return false
    return true
  })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getPriceForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return hotelPrices.find((p) => p.date === dateStr)
  }

  const getDayColor = (priceData: any) => {
    if (!priceData || !priceData.recommended_price || !priceData.our_price) {
      return "bg-muted/30 border-border/30"
    }
    if (priceData.autopilot_action === "increase") {
      return "bg-green-500/20 border-green-500/50"
    }
    if (priceData.autopilot_action === "decrease") {
      return "bg-red-500/20 border-red-500/50"
    }
    return "bg-cyan-500/20 border-cyan-500/50"
  }

  const getRecommendationIcon = (priceData: any) => {
    if (!priceData || !priceData.autopilot_action) return null
    if (priceData.autopilot_action === "increase") {
      return <TrendingUpIcon className="h-3 w-3 text-green-500" />
    }
    if (priceData.autopilot_action === "decrease") {
      return <TrendingDownIcon className="h-3 w-3 text-red-500" />
    }
    return <MinusIcon className="h-3 w-3 text-cyan-400" />
  }

  const getDemandBadge = (level: string) => {
    const colors: Record<string, string> = {
      peak: "bg-orange-500/20 text-orange-400 border-orange-500",
      high: "bg-yellow-500/20 text-yellow-400 border-yellow-500",
      medium: "bg-blue-500/20 text-blue-400 border-blue-500",
      low: "bg-gray-500/20 text-gray-400 border-gray-500",
    }
    return colors[level] || colors.medium
  }

  const getCompetitorColor = (competitorId: string) => {
    const comp = hotelCompetitors.find((c) => c.id === competitorId)
    return comp?.display_color || "#f97316"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Select
            value={selectedHotel}
            onValueChange={(v) => {
              setSelectedHotel(v)
              setSelectedRoomType("all")
            }}
          >
            <SelectTrigger className="w-48 bg-background/50">
              <SelectValue placeholder="Select hotel" />
            </SelectTrigger>
            <SelectContent>
              {hotels.map((hotel) => (
                <SelectItem key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
            <SelectTrigger className="w-48 bg-background/50">
              <SelectValue placeholder="All room types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Room Types</SelectItem>
              {hotelRoomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rt.display_color || "#06b6d4" }} />
                    {rt.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedHotel && selectedHotelData && (
            <RunScraperButton
              hotelId={selectedHotel}
              hotelName={selectedHotelData.name}
              roomTypeId={selectedRoomType !== "all" ? selectedRoomType : undefined}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="font-semibold min-w-32 text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {hotelCompetitors.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <span className="text-sm text-muted-foreground">Tracking:</span>
          {hotelCompetitors.map((comp) => (
            <div key={comp.id} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: comp.display_color || "#f97316" }} />
              <span className="text-sm">{comp.competitor_hotel_name}</span>
              {comp.star_rating && (
                <span className="text-xs text-muted-foreground">{"★".repeat(comp.star_rating)}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {days.map((day) => {
              const priceData = getPriceForDate(day)
              const dayColor = getDayColor(priceData)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(priceData)}
                  className={`aspect-square p-1 rounded-lg border ${dayColor} ${
                    isToday(day) ? "ring-2 ring-cyan-500" : ""
                  } hover:bg-accent/50 transition-colors cursor-pointer`}
                >
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isToday(day) ? "text-cyan-400" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {priceData?.demand_level && (
                        <Badge
                          variant="outline"
                          className={`text-[8px] px-1 py-0 ${getDemandBadge(priceData.demand_level)}`}
                        >
                          {priceData.demand_level}
                        </Badge>
                      )}
                    </div>

                    {priceData && (
                      <div className="flex-1 flex flex-col justify-end text-[10px] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Us:</span>
                          <span className="font-medium text-cyan-400">${priceData.our_price}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Avg:</span>
                          <span>${priceData.avg_competitor_price}</span>
                        </div>
                        {priceData.recommended_price && priceData.autopilot_action !== "maintain" && (
                          <div className="flex items-center justify-between pt-0.5 border-t border-border/50">
                            {getRecommendationIcon(priceData)}
                            <span className="font-bold text-yellow-400">${priceData.recommended_price}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDay && (
        <Card className="border-border/50 bg-card/50 border-cyan-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSignIcon className="h-5 w-5 text-cyan-400" />
              {format(new Date(selectedDay.date), "EEEE, MMMM d, yyyy")}
              <Badge variant="outline" className={getDemandBadge(selectedDay.demand_level)}>
                {selectedDay.demand_level} demand
              </Badge>
              {selectedRoomType !== "all" && hotelRoomTypes.find((rt) => rt.id === selectedRoomType) && (
                <Badge variant="outline" className="ml-2">
                  {hotelRoomTypes.find((rt) => rt.id === selectedRoomType)?.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Our Price</h4>
                <p className="text-3xl font-bold text-cyan-400">${selectedDay.our_price}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Competitor Range</h4>
                <p className="text-xl">
                  ${selectedDay.min_competitor_price} - ${selectedDay.max_competitor_price}
                </p>
                <p className="text-sm text-muted-foreground">Avg: ${selectedDay.avg_competitor_price}</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-muted-foreground">Recommendation</h4>
                <div className="flex items-center gap-2">
                  {getRecommendationIcon(selectedDay)}
                  <span className="text-2xl font-bold text-yellow-400">${selectedDay.recommended_price}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-cyan-400" />
                Competitor Price Breakdown
              </h4>

              {loadingCompetitors ? (
                <div className="text-center py-4 text-muted-foreground">Loading competitor details...</div>
              ) : hotelCompetitors.length > 0 ? (
                <div className="grid gap-2">
                  {hotelCompetitors.map((comp) => {
                    const priceData = competitorPrices.find((cp) => cp.competitor_id === comp.id)
                    const price = priceData?.price || 0
                    const priceDiff = price - selectedDay.our_price
                    const priceDiffPercent =
                      selectedDay.our_price > 0 ? ((priceDiff / selectedDay.our_price) * 100).toFixed(1) : "0"

                    return (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                        style={{ borderLeftColor: comp.display_color || "#f97316", borderLeftWidth: "4px" }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: comp.display_color || "#f97316" }}
                          />
                          <div>
                            <div className="font-medium">{comp.competitor_hotel_name}</div>
                            {comp.star_rating && (
                              <div className="text-xs text-muted-foreground">
                                {"★".repeat(comp.star_rating)} ({comp.star_rating} stars)
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {price > 0 ? (
                            <>
                              <div className="font-bold">${price}</div>
                              <div
                                className={`text-xs ${
                                  priceDiff > 0
                                    ? "text-green-400"
                                    : priceDiff < 0
                                      ? "text-red-400"
                                      : "text-muted-foreground"
                                }`}
                              >
                                {priceDiff > 0 ? "+" : ""}
                                {priceDiffPercent}% vs us
                              </div>
                            </>
                          ) : (
                            <div className="text-muted-foreground text-sm">No price data</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-400">No Competitors Configured</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add competitors to see price comparisons and get accurate recommendations.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 bg-transparent"
                        onClick={() => (window.location.href = "/competitors/add")}
                      >
                        + Add Competitors
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedDay.price_recommendation && (
              <div className="mt-4 p-3 rounded-lg bg-background/50 border border-border/50">
                <p className="text-sm">{selectedDay.price_recommendation}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Price Recommendations Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {hotelPrices
              .filter((p) => p.autopilot_action && p.autopilot_action !== "maintain")
              .slice(0, 15)
              .map((price) => (
                <div
                  key={price.id}
                  onClick={() => setSelectedDay(price)}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50 hover:border-cyan-500/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getRecommendationIcon(price)}
                    <div>
                      <div className="font-medium">{format(new Date(price.date), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-md">
                        {price.price_recommendation}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="text-muted-foreground">${price.our_price}</span>
                      <span className="mx-2">→</span>
                      <span className="text-yellow-400 font-bold">${price.recommended_price}</span>
                    </div>
                    <Badge variant="outline" className={getDemandBadge(price.demand_level)}>
                      {price.demand_level}
                    </Badge>
                  </div>
                </div>
              ))}
            {hotelPrices.filter((p) => p.autopilot_action && p.autopilot_action !== "maintain").length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No price recommendations available. Click "Run Full Scan" to analyze 180 days.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
