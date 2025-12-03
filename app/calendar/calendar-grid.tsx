"use client"

import { useState, useMemo } from "react"
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

interface CalendarGridProps {
  hotels: any[]
  dailyPrices: any[]
  roomTypes: any[]
  competitors: any[]
  competitorRoomTypes: any[]
  competitorDailyPrices: any[]
  bookings: any[]
  scanResults: any[]
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

export function CalendarGrid({
  hotels,
  dailyPrices,
  roomTypes,
  competitors,
  competitorRoomTypes,
  competitorDailyPrices,
  bookings,
  scanResults,
}: CalendarGridProps) {
  const [selectedHotel, setSelectedHotel] = useState<string>(hotels[0]?.id || "")
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all")
  const [selectedCompetitorRoomType, setSelectedCompetitorRoomType] = useState<string>("all")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<any>(null)

  const hotelRoomTypes = roomTypes.filter((rt) => rt.hotel_id === selectedHotel)
  const hotelCompetitors = competitors.filter((c) => c.hotel_id === selectedHotel)
  const hotelBookings = bookings.filter((b) => b.hotel_id === selectedHotel)
  const hotelScanResults = scanResults.filter((sr) => sr.hotel_id === selectedHotel)

  const hotelCompetitorIds = hotelCompetitors.map((c) => c.id)
  const availableCompetitorRoomTypes = competitorRoomTypes.filter((crt) =>
    hotelCompetitorIds.includes(crt.competitor_id),
  )

  const hotelCompetitorPrices = competitorDailyPrices.filter((cdp) => {
    if (!hotelCompetitorIds.includes(cdp.competitor_id)) return false
    if (selectedCompetitorRoomType !== "all" && cdp.room_type_id !== selectedCompetitorRoomType) return false
    return true
  })

  const competitorsWithColors = hotelCompetitors.map((comp, index) => ({
    ...comp,
    display_color: comp.display_color || COMPETITOR_COLORS[index % COMPETITOR_COLORS.length],
  }))

  const selectedHotelData = hotels.find((h) => h.id === selectedHotel)

  const hotelPrices = dailyPrices.filter((p) => {
    if (p.hotel_id !== selectedHotel) return false
    if (selectedRoomType !== "all" && p.room_type_id && p.room_type_id !== selectedRoomType) return false
    return true
  })

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, any[]>()
    hotelBookings.forEach((booking) => {
      const checkIn = new Date(booking.check_in_date)
      const checkOut = new Date(booking.check_out_date)
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, "yyyy-MM-dd")
        if (!map.has(dateStr)) {
          map.set(dateStr, [])
        }
        map.get(dateStr)!.push(booking)
      }
    })
    return map
  }, [hotelBookings])

  const scanResultsByDate = useMemo(() => {
    const map = new Map<string, any[]>()
    hotelScanResults.forEach((result) => {
      if (result.metadata?.check_in) {
        const dateStr = result.metadata.check_in
        if (!map.has(dateStr)) {
          map.set(dateStr, [])
        }
        map.get(dateStr)!.push(result)
      }
    })
    return map
  }, [hotelScanResults])

  const competitorPricesByDate = useMemo(() => {
    const map = new Map<string, any[]>()
    hotelCompetitorPrices.forEach((price) => {
      const dateStr = price.date
      if (!map.has(dateStr)) {
        map.set(dateStr, [])
      }
      map.get(dateStr)!.push(price)
    })
    return map
  }, [hotelCompetitorPrices])

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

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return bookingsByDate.get(dateStr) || []
  }

  const getScanResultsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return scanResultsByDate.get(dateStr) || []
  }

  const getCompetitorPricesForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return competitorPricesByDate.get(dateStr) || []
  }

  const getDayColor = (priceData: any, dayBookings: any[]) => {
    if (dayBookings.length > 0) {
      const occupancyRate = dayBookings.length / (selectedHotelData?.total_rooms || 50)
      if (occupancyRate > 0.8) return "bg-purple-500/30 border-purple-500/50"
      if (occupancyRate > 0.5) return "bg-purple-500/20 border-purple-500/40"
      return "bg-purple-500/10 border-purple-500/30"
    }

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Select
            value={selectedHotel}
            onValueChange={(v) => {
              setSelectedHotel(v)
              setSelectedRoomType("all")
              setSelectedCompetitorRoomType("all")
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
              <SelectValue placeholder="Our room types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
                  All Our Room Types
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
                    {rt.base_price && <span className="text-xs text-muted-foreground">₪{rt.base_price}</span>}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCompetitorRoomType} onValueChange={setSelectedCompetitorRoomType}>
            <SelectTrigger className="w-56 bg-background/50 border-orange-500/50">
              <BuildingIcon className="h-4 w-4 mr-2 text-orange-400" />
              <SelectValue placeholder="Competitor room types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-red-500" />
                  All Competitor Room Types
                </div>
              </SelectItem>
              {availableCompetitorRoomTypes.map((crt) => (
                <SelectItem key={crt.id} value={crt.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: crt.display_color || "#f97316" }} />
                    <span>{crt.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({crt.hotel_competitors?.competitor_hotel_name})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                  Base price: ₪{selectedRoomTypeData.base_price} | Avg price: ₪{avgPriceForRoomType}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold" style={{ color: selectedRoomTypeData.display_color || "#06b6d4" }}>
                ₪{avgPriceForRoomType}
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
              const dayBookings = getBookingsForDate(day)
              const dayScanResults = getScanResultsForDate(day)
              const dayCompetitorPrices = getCompetitorPricesForDate(day)
              const occupancy = dayBookings.length
              const totalRooms = selectedHotelData?.total_rooms || 50
              const occupancyPercent = Math.round((occupancy / totalRooms) * 100)

              const bookingPrices = dayCompetitorPrices.filter((p) => p.source === "Booking.com")
              const expediaPrices = dayCompetitorPrices.filter((p) => p.source === "Expedia")
              const bookingAvg =
                bookingPrices.length > 0
                  ? Math.round(bookingPrices.reduce((sum, p) => sum + (p.price || 0), 0) / bookingPrices.length)
                  : null
              const expediaAvg =
                expediaPrices.length > 0
                  ? Math.round(expediaPrices.reduce((sum, p) => sum + (p.price || 0), 0) / expediaPrices.length)
                  : null

              return (
                <div
                  key={day.toISOString()}
                  onClick={() =>
                    setSelectedDay({
                      date: format(day, "yyyy-MM-dd"),
                      priceData,
                      bookings: dayBookings,
                      scanResults: dayScanResults,
                      competitorPrices: dayCompetitorPrices,
                    })
                  }
                  className={`aspect-square p-1 rounded-lg border ${getDayColor(priceData, dayBookings)} ${
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

                    {dayCompetitorPrices.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mt-0.5">
                        {competitorsWithColors.map((comp) => {
                          const hasPrice = dayCompetitorPrices.some((p) => p.competitor_id === comp.id)
                          if (!hasPrice) return null
                          return (
                            <div
                              key={comp.id}
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: comp.display_color }}
                              title={comp.competitor_hotel_name}
                            />
                          )
                        })}
                      </div>
                    )}

                    {priceData && (
                      <div className="flex-1 flex flex-col justify-end text-[10px] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Us:</span>
                          <span className="font-medium text-cyan-400">₪{priceData.our_price}</span>
                        </div>
                        {bookingAvg && (
                          <div className="flex items-center justify-between">
                            <span className="text-blue-400 text-[8px]">B:</span>
                            <span className="text-blue-400 font-medium">₪{bookingAvg}</span>
                          </div>
                        )}
                        {expediaAvg && (
                          <div className="flex items-center justify-between">
                            <span className="text-yellow-400 text-[8px]">E:</span>
                            <span className="text-yellow-400 font-medium">₪{expediaAvg}</span>
                          </div>
                        )}
                        {priceData.recommended_price && priceData.autopilot_action !== "maintain" && (
                          <div className="flex items-center justify-between pt-0.5 border-t border-border/50">
                            {getRecommendationIcon(priceData)}
                            <span className="font-bold text-yellow-400">₪{priceData.recommended_price}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!priceData && dayCompetitorPrices.length > 0 && (
                      <div className="flex-1 flex flex-col justify-end text-[10px] space-y-0.5">
                        {bookingAvg && (
                          <div className="flex items-center justify-between">
                            <span className="text-blue-400 text-[8px]">B:</span>
                            <span className="text-blue-400 font-medium">₪{bookingAvg}</span>
                          </div>
                        )}
                        {expediaAvg && (
                          <div className="flex items-center justify-between">
                            <span className="text-yellow-400 text-[8px]">E:</span>
                            <span className="text-yellow-400 font-medium">₪{expediaAvg}</span>
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

      {/* Selected Day Details Panel */}
      {selectedDay && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{format(new Date(selectedDay.date), "EEEE, MMMM d, yyyy")}</span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Occupancy Section */}
            {selectedDay.bookings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <BedDoubleIcon className="h-4 w-4 text-purple-400" />
                  Bookings ({selectedDay.bookings.length})
                </h4>
                <div className="grid gap-2 max-h-40 overflow-y-auto">
                  {selectedDay.bookings.map((booking: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-muted/20 rounded text-sm">
                      <div>
                        <span className="font-medium">{booking.guest_name}</span>
                        <span className="text-muted-foreground ml-2">
                          {booking.check_in_date} - {booking.check_out_date}
                        </span>
                      </div>
                      <div className="text-green-400">₪{booking.total_price?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between pt-2 border-t border-border/50">
                  <span className="font-medium">Total Revenue</span>
                  <span className="text-green-400 font-bold">
                    ₪
                    {selectedDay.bookings
                      .reduce((sum: number, b: any) => sum + (b.total_price || 0), 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Your Hotel's Prices on Different Channels */}
            {selectedDay.scanResults && selectedDay.scanResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <DollarSignIcon className="h-4 w-4 text-cyan-400" />
                  Your Hotel - Channel Prices ({selectedDay.scanResults.length})
                </h4>
                <div className="grid gap-2">
                  {selectedDay.scanResults.map((result: any, i: number) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-2 bg-cyan-500/10 rounded text-sm border-l-[3px] border-cyan-500"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: ["#3b82f6", "#f97316", "#22c55e", "#8b5cf6", "#eab308", "#ec4899"][i % 6],
                          }}
                        />
                        <span className="font-medium">{result.source}</span>
                        <span className="text-muted-foreground text-xs">({result.room_type})</span>
                      </div>
                      <div className="text-cyan-400 font-bold">₪{Number.parseFloat(result.price).toLocaleString()}</div>
                    </div>
                  ))}
                  {/* Channel Average */}
                  <div className="flex justify-between items-center p-2 bg-cyan-500/20 rounded text-sm mt-1">
                    <span className="text-cyan-400 font-medium">Channel Average</span>
                    <span className="text-cyan-400 font-bold">
                      ₪
                      {Math.round(
                        selectedDay.scanResults.reduce(
                          (sum: number, r: any) => sum + Number.parseFloat(r.price || 0),
                          0,
                        ) / selectedDay.scanResults.length,
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Competitor Hotels Prices */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-orange-400" />
                Competitor Hotels ({competitorsWithColors.length})
              </h4>

              {selectedDay.competitorPrices && selectedDay.competitorPrices.length > 0 ? (
                <div className="grid gap-2">
                  {(() => {
                    // Group prices by competitor name
                    const groupedByCompetitor: Record<string, any[]> = {}
                    selectedDay.competitorPrices.forEach((price: any) => {
                      const name = price.hotel_competitors?.competitor_hotel_name || "Unknown"
                      if (!groupedByCompetitor[name]) {
                        groupedByCompetitor[name] = []
                      }
                      groupedByCompetitor[name].push(price)
                    })

                    return Object.entries(groupedByCompetitor).map(([competitorName, prices], groupIndex) => {
                      const firstPrice = prices[0]
                      const competitor = competitorsWithColors.find((c) => c.id === firstPrice.competitor_id)
                      const color =
                        competitor?.display_color || COMPETITOR_COLORS[groupIndex % COMPETITOR_COLORS.length]

                      return (
                        <div
                          key={competitorName}
                          className="p-2 rounded text-sm"
                          style={{
                            backgroundColor: `${color}15`,
                            borderLeft: `3px solid ${color}`,
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-medium">{competitorName}</span>
                            {competitor?.star_rating && (
                              <span className="text-xs text-yellow-500">{"★".repeat(competitor.star_rating)}</span>
                            )}
                          </div>
                          <div className="flex gap-3 ml-5">
                            {prices.map((price: any, i: number) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">
                                  {price.source === "Booking.com"
                                    ? "B"
                                    : price.source === "Expedia"
                                      ? "E"
                                      : price.source?.charAt(0)}
                                  :
                                </span>
                                <span className="text-orange-400 font-bold">
                                  ₪{Number(price.price).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  })()}

                  {/* Market Average - Split to separate averages per platform */}
                  {(() => {
                    const bookingPrices = selectedDay.competitorPrices.filter((p: any) => p.source === "Booking.com")
                    const expediaPrices = selectedDay.competitorPrices.filter((p: any) => p.source === "Expedia")
                    const bookingAvg =
                      bookingPrices.length > 0
                        ? Math.round(
                            bookingPrices.reduce((sum: number, p: any) => sum + Number(p.price || 0), 0) /
                              bookingPrices.length,
                          )
                        : null
                    const expediaAvg =
                      expediaPrices.length > 0
                        ? Math.round(
                            expediaPrices.reduce((sum: number, p: any) => sum + Number(p.price || 0), 0) /
                              expediaPrices.length,
                          )
                        : null

                    return (
                      <div className="space-y-1 mt-2">
                        {bookingAvg && (
                          <div className="flex justify-between items-center p-2 bg-blue-500/10 rounded text-sm border-l-[3px] border-blue-500">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500" />
                              <span className="font-medium text-blue-400">Booking.com Average</span>
                              <span className="text-xs text-muted-foreground">({bookingPrices.length} hotels)</span>
                            </div>
                            <div className="text-blue-400 font-bold">₪{bookingAvg.toLocaleString()}</div>
                          </div>
                        )}
                        {expediaAvg && (
                          <div className="flex justify-between items-center p-2 bg-yellow-500/10 rounded text-sm border-l-[3px] border-yellow-500">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-yellow-500" />
                              <span className="font-medium text-yellow-400">Expedia Average</span>
                              <span className="text-xs text-muted-foreground">({expediaPrices.length} hotels)</span>
                            </div>
                            <div className="text-yellow-400 font-bold">₪{expediaAvg.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                /* Updated message to point to main scan button */
                <div className="grid gap-2">
                  {competitorsWithColors.length > 0 ? (
                    <>
                      {competitorsWithColors.map((comp) => (
                        <div
                          key={comp.id}
                          className="flex justify-between items-center p-2 rounded text-sm opacity-60"
                          style={{
                            backgroundColor: `${comp.display_color}15`,
                            borderLeft: `3px solid ${comp.display_color}`,
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: comp.display_color }} />
                            <span className="font-medium">{comp.competitor_hotel_name}</span>
                            {comp.star_rating && (
                              <span className="text-xs text-yellow-500">{"★".repeat(comp.star_rating)}</span>
                            )}
                          </div>
                          <span className="text-muted-foreground text-xs">No data</span>
                        </div>
                      ))}
                      <div className="text-center py-3 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg mt-2">
                        <AlertTriangleIcon className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
                        <p className="text-yellow-400 font-medium">No competitor price data yet</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          Click "Run Full Scan (180 Days)" button at the top of the page to scan your hotel and all
                          competitors together
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <BuildingIcon className="h-6 w-6 mx-auto mb-2" />
                      <p className="text-sm">No competitors configured</p>
                      <p className="text-xs">Add competitors in the Competitors page</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Price Recommendation Section */}
            {selectedDay.priceData && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <DollarSignIcon className="h-4 w-4 text-cyan-400" />
                  Price Recommendation
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-muted/20 rounded">
                    <div className="text-xs text-muted-foreground">Current</div>
                    <div className="text-lg font-bold">₪{selectedDay.priceData.our_price}</div>
                  </div>
                  <div className="p-3 bg-muted/20 rounded">
                    <div className="text-xs text-muted-foreground">Recommended</div>
                    <div className="text-lg font-bold text-cyan-400">₪{selectedDay.priceData.recommended_price}</div>
                  </div>
                  <div className="p-3 bg-muted/20 rounded">
                    <div className="text-xs text-muted-foreground">Action</div>
                    <Badge
                      className={
                        selectedDay.priceData.autopilot_action === "increase"
                          ? "bg-green-500/20 text-green-400"
                          : selectedDay.priceData.autopilot_action === "decrease"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-cyan-500/20 text-cyan-400"
                      }
                    >
                      {selectedDay.priceData.autopilot_action || "maintain"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* No data message */}
            {!selectedDay.bookings.length &&
              !selectedDay.scanResults.length &&
              !selectedDay.competitorPrices?.length &&
              !selectedDay.priceData &&
              competitorsWithColors.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <AlertTriangleIcon className="h-8 w-8 mx-auto mb-2" />
                  <p>No data available for this date</p>
                  <p className="text-sm">Run a scan to get competitor prices</p>
                </div>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
