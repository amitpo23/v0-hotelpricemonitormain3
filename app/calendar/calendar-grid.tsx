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
  BedDoubleIcon,
} from "@/components/icons"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns"
import { RunScraperButton } from "./run-scraper-button"

interface CalendarGridProps {
  hotels: any[]
  dailyPrices: any[]
  roomTypes: any[]
  competitors: any[]
}

const COMPETITOR_COLORS = [
  "#f97316", // orange
  "#8b5cf6", // purple
  "#22c55e", // green
  "#ec4899", // pink
  "#eab308", // yellow
  "#3b82f6", // blue
  "#ef4444", // red
  "#14b8a6", // teal
]

export function CalendarGrid({ hotels, dailyPrices, roomTypes, competitors }: CalendarGridProps) {
  const [selectedHotel, setSelectedHotel] = useState<string>(hotels[0]?.id || "")
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<any>(null)
  const [competitorPrices, setCompetitorPrices] = useState<any[]>([])
  const [loadingCompetitors, setLoadingCompetitors] = useState(false)

  const hotelRoomTypes = roomTypes.filter((rt) => rt.hotel_id === selectedHotel)
  const hotelCompetitors = competitors.filter((c) => c.hotel_id === selectedHotel)

  const competitorsWithColors = hotelCompetitors.map((comp, index) => ({
    ...comp,
    display_color: comp.display_color || COMPETITOR_COLORS[index % COMPETITOR_COLORS.length],
  }))

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

  const selectedRoomTypeData = hotelRoomTypes.find((rt) => rt.id === selectedRoomType)
  const avgPriceForRoomType =
    hotelPrices.length > 0
      ? Math.round(hotelPrices.reduce((sum, p) => sum + (p.our_price || 0), 0) / hotelPrices.length)
      : selectedRoomTypeData?.base_price || 0

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

  const getCompetitorAvg = () => {
    if (competitorPrices.length === 0) return 0
    return Math.round(competitorPrices.reduce((sum, cp) => sum + (cp.price || 0), 0) / competitorPrices.length)
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
              setSelectedDay(null)
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
            <SelectTrigger className="w-56 bg-background/50">
              <BedDoubleIcon className="h-4 w-4 mr-2 text-cyan-400" />
              <SelectValue placeholder="All room types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                  All Room Types
                </div>
              </SelectItem>
              {hotelRoomTypes.map((rt) => (
                <SelectItem key={rt.id} value={rt.id}>
                  <div className="flex items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: rt.display_color || "#06b6d4" }}
                      />
                      {rt.name}
                    </div>
                    {rt.base_price && <span className="text-xs text-muted-foreground">${rt.base_price}</span>}
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

      {selectedRoomType !== "all" && selectedRoomTypeData && (
        <div
          className="p-3 rounded-lg border"
          style={{ borderColor: selectedRoomTypeData.display_color || "#06b6d4", borderLeftWidth: "4px" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BedDoubleIcon className="h-5 w-5" style={{ color: selectedRoomTypeData.display_color || "#06b6d4" }} />
              <div>
                <span className="font-medium">{selectedRoomTypeData.name}</span>
                <p className="text-xs text-muted-foreground">
                  Base price: ${selectedRoomTypeData.base_price} | Avg price: ${avgPriceForRoomType}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold" style={{ color: selectedRoomTypeData.display_color || "#06b6d4" }}>
                ${avgPriceForRoomType}
              </span>
              <p className="text-xs text-muted-foreground">avg/night</p>
            </div>
          </div>
        </div>
      )}

      {competitorsWithColors.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <BuildingIcon className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-medium">Competitors Tracked:</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {competitorsWithColors.map((comp) => (
              <div
                key={comp.id}
                className="flex items-center gap-2 px-2 py-1 rounded-md"
                style={{ backgroundColor: `${comp.display_color}20`, borderLeft: `3px solid ${comp.display_color}` }}
              >
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: comp.display_color }} />
                <span className="text-sm font-medium">{comp.competitor_hotel_name}</span>
                {comp.star_rating && <span className="text-xs text-yellow-500">{"★".repeat(comp.star_rating)}</span>}
              </div>
            ))}
            {/* Average indicator */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-cyan-500/20 border-l-[3px] border-cyan-500">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
              <span className="text-sm font-medium text-cyan-400">Market Average</span>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
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
                  } ${selectedDay?.date === format(day, "yyyy-MM-dd") ? "ring-2 ring-yellow-500" : ""} hover:bg-accent/50 transition-colors cursor-pointer`}
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
        <Card className="border-border/50 bg-card/50 border-l-4 border-l-cyan-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSignIcon className="h-5 w-5 text-cyan-400" />
              {format(new Date(selectedDay.date), "EEEE, MMMM d, yyyy")}
              <Badge variant="outline" className={getDemandBadge(selectedDay.demand_level)}>
                {selectedDay.demand_level} demand
              </Badge>
              {selectedRoomType !== "all" && selectedRoomTypeData && (
                <Badge variant="outline" className="ml-2" style={{ borderColor: selectedRoomTypeData.display_color }}>
                  {selectedRoomTypeData.name}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Price comparison cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              {/* Our Price */}
              <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                <h4 className="font-semibold text-sm text-cyan-400 mb-1">Our Price</h4>
                <p className="text-3xl font-bold text-cyan-400">${selectedDay.our_price}</p>
              </div>

              {/* Market Average */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="font-semibold text-sm text-blue-400 mb-1">Market Average</h4>
                <p className="text-3xl font-bold text-blue-400">${selectedDay.avg_competitor_price}</p>
                <p
                  className={`text-xs mt-1 ${selectedDay.our_price < selectedDay.avg_competitor_price ? "text-green-400" : selectedDay.our_price > selectedDay.avg_competitor_price ? "text-red-400" : "text-muted-foreground"}`}
                >
                  {selectedDay.our_price < selectedDay.avg_competitor_price
                    ? `${Math.round((1 - selectedDay.our_price / selectedDay.avg_competitor_price) * 100)}% below avg`
                    : selectedDay.our_price > selectedDay.avg_competitor_price
                      ? `${Math.round((selectedDay.our_price / selectedDay.avg_competitor_price - 1) * 100)}% above avg`
                      : "At market price"}
                </p>
              </div>

              {/* Price Range */}
              <div className="p-4 rounded-lg bg-slate-500/10 border border-slate-500/30">
                <h4 className="font-semibold text-sm text-slate-400 mb-1">Competitor Range</h4>
                <p className="text-xl font-bold">
                  ${selectedDay.min_competitor_price} - ${selectedDay.max_competitor_price}
                </p>
              </div>

              {/* Recommendation */}
              <div
                className={`p-4 rounded-lg border ${
                  selectedDay.autopilot_action === "increase"
                    ? "bg-green-500/10 border-green-500/30"
                    : selectedDay.autopilot_action === "decrease"
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-yellow-500/10 border-yellow-500/30"
                }`}
              >
                <h4 className="font-semibold text-sm text-yellow-400 mb-1 flex items-center gap-2">
                  Autopilot Suggests
                  {getRecommendationIcon(selectedDay)}
                </h4>
                <p className="text-3xl font-bold text-yellow-400">${selectedDay.recommended_price}</p>
              </div>
            </div>

            {/* Competitor breakdown by color */}
            <div className="border-t border-border/50 pt-4">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-cyan-400" />
                Competitor Price Breakdown
                {competitorPrices.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">(Avg: ${getCompetitorAvg()})</span>
                )}
              </h4>

              {loadingCompetitors ? (
                <div className="text-center py-4 text-muted-foreground">Loading competitor details...</div>
              ) : competitorsWithColors.length > 0 ? (
                <div className="space-y-3">
                  {/* Visual comparison bar */}
                  <div className="p-4 rounded-lg bg-slate-800/50 border border-border/50">
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-sm text-muted-foreground w-20">Price</span>
                      <div className="flex-1 h-8 bg-slate-700/50 rounded-full relative overflow-hidden">
                        {/* Our price marker */}
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-cyan-500 z-10"
                          style={{
                            left: `${Math.min(Math.max(((selectedDay.our_price - selectedDay.min_competitor_price) / (selectedDay.max_competitor_price - selectedDay.min_competitor_price)) * 100, 0), 100)}%`,
                          }}
                        />
                        {/* Competitor markers */}
                        {competitorsWithColors.map((comp) => {
                          const priceData = competitorPrices.find((cp) => cp.competitor_id === comp.id)
                          const price = priceData?.price || 0
                          if (price === 0) return null
                          const position =
                            ((price - selectedDay.min_competitor_price) /
                              (selectedDay.max_competitor_price - selectedDay.min_competitor_price)) *
                            100
                          return (
                            <div
                              key={comp.id}
                              className="absolute top-1 bottom-1 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{
                                left: `calc(${Math.min(Math.max(position, 0), 95)}% - 12px)`,
                                backgroundColor: comp.display_color,
                              }}
                              title={`${comp.competitor_hotel_name}: $${price}`}
                            >
                              {comp.competitor_hotel_name.charAt(0).toUpperCase()}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>${selectedDay.min_competitor_price}</span>
                      <span className="text-cyan-400">Us: ${selectedDay.our_price}</span>
                      <span>${selectedDay.max_competitor_price}</span>
                    </div>
                  </div>

                  {/* Individual competitor cards */}
                  <div className="grid gap-2">
                    {competitorsWithColors.map((comp) => {
                      const priceData = competitorPrices.find((cp) => cp.competitor_id === comp.id)
                      const price = priceData?.price || 0
                      const priceDiff = price - selectedDay.our_price
                      const priceDiffPercent =
                        selectedDay.our_price > 0 ? ((priceDiff / selectedDay.our_price) * 100).toFixed(1) : "0"

                      return (
                        <div
                          key={comp.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                          style={{ borderLeftColor: comp.display_color, borderLeftWidth: "4px" }}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: comp.display_color }}
                            >
                              {comp.competitor_hotel_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium">{comp.competitor_hotel_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {comp.star_rating && (
                                  <span className="text-yellow-500">{"★".repeat(comp.star_rating)} </span>
                                )}
                                {priceData?.room_type && `• ${priceData.room_type}`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {price > 0 ? (
                              <>
                                <div className="font-bold text-lg">${price}</div>
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
                              <div className="text-muted-foreground text-sm">No data</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
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

      {/* Price Recommendations Summary */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Autopilot Recommendations Summary</span>
            {selectedRoomType !== "all" && selectedRoomTypeData && (
              <Badge variant="outline" style={{ borderColor: selectedRoomTypeData.display_color }}>
                {selectedRoomTypeData.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {hotelPrices
              .filter((p) => p.autopilot_action !== "maintain" && new Date(p.date) >= new Date())
              .slice(0, 10)
              .map((p) => (
                <div
                  key={p.date}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    p.autopilot_action === "increase" ? "bg-green-500/10" : "bg-red-500/10"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {p.autopilot_action === "increase" ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-500" />
                    )}
                    <span>{format(new Date(p.date), "MMM d")}</span>
                    <Badge variant="outline" className={getDemandBadge(p.demand_level)}>
                      {p.demand_level}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">${p.our_price}</span>
                    <span>→</span>
                    <span className="font-bold text-yellow-400">${p.recommended_price}</span>
                  </div>
                </div>
              ))}
            {hotelPrices.filter((p) => p.autopilot_action !== "maintain" && new Date(p.date) >= new Date()).length ===
              0 && (
              <p className="text-center text-muted-foreground py-4">
                No price changes recommended. Run a scan to get recommendations.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
