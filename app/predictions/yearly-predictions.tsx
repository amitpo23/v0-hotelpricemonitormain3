"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, RefreshCwIcon, TrendingUpIcon, TrendingDownIcon, BedDoubleIcon } from "@/components/icons"

interface Hotel {
  id: string
  name: string
  base_price: number
  location?: string
}

interface RoomType {
  id: string
  hotel_id: string
  name: string
  base_price: number
  display_color: string
}

interface YearlyPredictionsProps {
  hotels: Hotel[]
  roomTypes: RoomType[]
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

// Tel Aviv market data based on the research document
const MARKET_DATA = {
  seasonality: {
    0: { factor: 0.85, demand: "low", avgPrice: 139, tourists: "low" },
    1: { factor: 0.8, demand: "very_low", avgPrice: 139, tourists: "lowest" },
    2: { factor: 0.9, demand: "medium", avgPrice: 150, tourists: "growing" },
    3: { factor: 1.0, demand: "high", avgPrice: 171, tourists: "passover" },
    4: { factor: 1.05, demand: "high", avgPrice: 165, tourists: "high" },
    5: { factor: 1.15, demand: "very_high", avgPrice: 175, tourists: "pride" },
    6: { factor: 1.25, demand: "very_high", avgPrice: 185, tourists: "peak" },
    7: { factor: 1.3, demand: "very_high", avgPrice: 190, tourists: "peak" },
    8: { factor: 1.1, demand: "high", avgPrice: 165, tourists: "holidays" },
    9: { factor: 0.95, demand: "medium", avgPrice: 155, tourists: "sukkot" },
    10: { factor: 0.9, demand: "medium", avgPrice: 150, tourists: "declining" },
    11: { factor: 1.2, demand: "high", avgPrice: 170, tourists: "holiday" },
  },
  events: {
    0: ["New Year aftermath"],
    1: ["Tel Aviv Marathon"],
    2: ["Purim", "Spring break start"],
    3: ["Passover", "Easter tourism"],
    4: ["Independence Day", "Eurovision period"],
    5: ["Pride Week", "Summer start"],
    6: ["Peak summer", "European vacation"],
    7: ["Peak summer", "Family travel"],
    8: ["Rosh Hashanah", "Business conferences"],
    9: ["Sukkot", "Autumn tourism"],
    10: ["Low season", "Business travel"],
    11: ["Hanukkah", "Christmas tourism", "New Year's Eve"],
  },
}

const ROOM_TYPE_MULTIPLIERS: Record<string, number> = {
  standard: 1.0,
  superior: 1.2,
  deluxe: 1.5,
  "junior suite": 1.8,
  "executive suite": 2.2,
  suite: 2.0,
  family: 1.4,
  studio: 1.1,
}

function getRoomTypeMultiplier(roomTypeName: string): number {
  const lowerName = roomTypeName.toLowerCase()
  for (const [key, multiplier] of Object.entries(ROOM_TYPE_MULTIPLIERS)) {
    if (lowerName.includes(key)) return multiplier
  }
  return 1.0
}

export function YearlyPredictions({ hotels, roomTypes }: YearlyPredictionsProps) {
  const [selectedHotel, setSelectedHotel] = useState<string>(hotels[0]?.id || "")
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  const [monthlyData, setMonthlyData] = useState<any[]>([])

  const hotelRoomTypes = roomTypes.filter((rt) => rt.hotel_id === selectedHotel)
  const selectedRoomTypeData = hotelRoomTypes.find((rt) => rt.id === selectedRoomType)

  const generateYearlyPredictions = async () => {
    setLoading(true)

    const hotel = hotels.find((h) => h.id === selectedHotel)
    if (!hotel) return

    let basePrice = hotel.base_price || 150
    let roomMultiplier = 1.0

    if (selectedRoomType !== "all" && selectedRoomTypeData) {
      basePrice = selectedRoomTypeData.base_price || basePrice
      roomMultiplier = getRoomTypeMultiplier(selectedRoomTypeData.name)
    }

    const predictions: any[] = []

    for (let month = 0; month < 12; month++) {
      const marketData = MARKET_DATA.seasonality[month as keyof typeof MARKET_DATA.seasonality]
      const events = MARKET_DATA.events[month as keyof typeof MARKET_DATA.events]

      const predictedPrice = Math.round(basePrice * marketData.factor * roomMultiplier)
      const marketAvg = Math.round(marketData.avgPrice * roomMultiplier)
      const priceDiff = (((predictedPrice - marketAvg) / marketAvg) * 100).toFixed(1)

      const occupancyRates: Record<string, number> = {
        very_low: 45,
        low: 55,
        medium: 65,
        high: 75,
        very_high: 85,
      }
      const occupancy = occupancyRates[marketData.demand] || 65
      const daysInMonth = new Date(selectedYear, month + 1, 0).getDate()

      const roomCount =
        selectedRoomType === "all" ? 50 : selectedRoomTypeData?.name.toLowerCase().includes("suite") ? 10 : 20
      const projectedRevenue = Math.round(predictedPrice * roomCount * (occupancy / 100) * daysInMonth)

      predictions.push({
        month,
        monthName: MONTHS[month],
        predictedPrice,
        marketAvg,
        priceDiff: Number(priceDiff),
        demand: marketData.demand,
        occupancy,
        projectedRevenue,
        events,
        tourists: marketData.tourists,
        roomType: selectedRoomTypeData?.name || "All Rooms",
      })
    }

    setMonthlyData(predictions)
    setLoading(false)
  }

  useEffect(() => {
    setSelectedRoomType("all")
    setMonthlyData([])
  }, [selectedHotel])

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case "very_high":
        return "bg-red-500"
      case "high":
        return "bg-orange-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      case "very_low":
        return "bg-blue-500"
      default:
        return "bg-slate-500"
    }
  }

  const getDemandBgColor = (demand: string) => {
    switch (demand) {
      case "very_high":
        return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
      case "high":
        return "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800"
      case "medium":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800"
      case "low":
        return "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
      case "very_low":
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
      default:
        return "bg-slate-50 border-slate-200 dark:bg-slate-950/30 dark:border-slate-800"
    }
  }

  const totalYearRevenue = monthlyData.reduce((sum, m) => sum + m.projectedRevenue, 0)
  const avgYearPrice =
    monthlyData.length > 0 ? Math.round(monthlyData.reduce((sum, m) => sum + m.predictedPrice, 0) / 12) : 0

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-purple-500" />
            Yearly Price Predictions
          </CardTitle>
          <CardDescription>Generate monthly predictions by room type based on Tel Aviv market data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Hotel</label>
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger className="w-[200px]">
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Room Type</label>
              <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
                <SelectTrigger className="w-[200px]">
                  <BedDoubleIcon className="h-4 w-4 mr-2 text-cyan-500" />
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
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: rt.display_color || "#06b6d4" }}
                        />
                        {rt.name} (${rt.base_price})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={generateYearlyPredictions} disabled={loading || !selectedHotel}>
              {loading ? (
                <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUpIcon className="h-4 w-4 mr-2" />
              )}
              Generate Yearly Forecast
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedRoomType !== "all" && selectedRoomTypeData && (
        <Card className="border-l-4" style={{ borderLeftColor: selectedRoomTypeData.display_color || "#06b6d4" }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BedDoubleIcon className="h-6 w-6" style={{ color: selectedRoomTypeData.display_color || "#06b6d4" }} />
                <div>
                  <p className="font-medium">{selectedRoomTypeData.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Base price: ${selectedRoomTypeData.base_price} | Multiplier:{" "}
                    {getRoomTypeMultiplier(selectedRoomTypeData.name).toFixed(1)}x
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: selectedRoomTypeData.display_color || "#06b6d4" }}>
                  ${selectedRoomTypeData.base_price}
                </p>
                <p className="text-xs text-muted-foreground">base/night</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {monthlyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Projected Annual Revenue</div>
              <div className="text-3xl font-bold">
                $
                {totalYearRevenue >= 1000000
                  ? (totalYearRevenue / 1000000).toFixed(2) + "M"
                  : (totalYearRevenue / 1000).toFixed(0) + "K"}
              </div>
              {selectedRoomTypeData && <div className="text-xs opacity-70 mt-1">{selectedRoomTypeData.name}</div>}
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Average Price</div>
              <div className="text-3xl font-bold">${avgYearPrice}</div>
              <div className="text-xs opacity-70 mt-1">per night</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Peak Month</div>
              <div className="text-3xl font-bold">August</div>
              <div className="text-xs opacity-70 mt-1">
                ${Math.round(190 * getRoomTypeMultiplier(selectedRoomTypeData?.name || "standard"))} avg
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="pt-6">
              <div className="text-sm opacity-80">Low Month</div>
              <div className="text-3xl font-bold">February</div>
              <div className="text-xs opacity-70 mt-1">
                ${Math.round(139 * getRoomTypeMultiplier(selectedRoomTypeData?.name || "standard"))} avg
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monthly Grid */}
      {monthlyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {monthlyData.map((month) => (
            <Card key={month.month} className={`border-2 ${getDemandBgColor(month.demand)}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{month.monthName}</CardTitle>
                  <div className={`w-3 h-3 rounded-full ${getDemandColor(month.demand)}`} />
                </div>
                {selectedRoomTypeData && (
                  <div className="text-xs text-muted-foreground">{selectedRoomTypeData.name}</div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Recommended Price</span>
                  <span className="text-2xl font-bold">${month.predictedPrice}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Market Avg</span>
                  <span className="flex items-center gap-1">
                    ${month.marketAvg}
                    {month.priceDiff > 0 ? (
                      <TrendingUpIcon className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDownIcon className="h-3 w-3 text-red-500" />
                    )}
                    <span className={month.priceDiff > 0 ? "text-green-600" : "text-red-600"}>
                      {month.priceDiff > 0 ? "+" : ""}
                      {month.priceDiff}%
                    </span>
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Occupancy</span>
                  <span className="font-medium">{month.occupancy}%</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-medium">${(month.projectedRevenue / 1000).toFixed(0)}K</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">Events & Factors:</div>
                  <div className="flex flex-wrap gap-1">
                    {month.events.map((event: string, i: number) => (
                      <span key={i} className="text-xs bg-background/50 px-2 py-0.5 rounded">
                        {event}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs capitalize text-center pt-2 border-t">
                  <span className={`px-2 py-1 rounded ${getDemandColor(month.demand)} text-white`}>
                    {month.demand.replace("_", " ")} demand
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {monthlyData.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <CalendarIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No yearly predictions yet</h3>
            <p className="text-slate-500">
              Select a hotel, room type, and click "Generate Yearly Forecast" to see monthly predictions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
