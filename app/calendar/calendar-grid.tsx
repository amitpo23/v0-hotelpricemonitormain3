"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns"

interface CalendarGridProps {
  hotels: any[]
  dailyPrices: any[]
}

export function CalendarGrid({ hotels, dailyPrices }: CalendarGridProps) {
  const [selectedHotel, setSelectedHotel] = useState<string>(hotels[0]?.id || "")
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const hotelPrices = dailyPrices.filter((p) => p.hotel_id === selectedHotel)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getPriceForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return hotelPrices.find((p) => p.date === dateStr)
  }

  const getDayColor = (priceData: any) => {
    if (!priceData || !priceData.recommended_price || !priceData.our_price) {
      return "bg-muted/30"
    }
    if (priceData.recommended_price > priceData.our_price) {
      return "bg-green-500/20 border-green-500/50"
    }
    if (priceData.recommended_price < priceData.our_price) {
      return "bg-red-500/20 border-red-500/50"
    }
    return "bg-cyan-500/20 border-cyan-500/50"
  }

  const getRecommendationIcon = (priceData: any) => {
    if (!priceData || !priceData.recommended_price || !priceData.our_price) return null
    if (priceData.recommended_price > priceData.our_price) {
      return <TrendingUp className="h-3 w-3 text-green-500" />
    }
    if (priceData.recommended_price < priceData.our_price) {
      return <TrendingDown className="h-3 w-3 text-red-500" />
    }
    return <Minus className="h-3 w-3 text-cyan-400" />
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Select value={selectedHotel} onValueChange={setSelectedHotel}>
          <SelectTrigger className="w-64 bg-background/50">
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

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold min-w-32 text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month start */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days */}
            {days.map((day) => {
              const priceData = getPriceForDate(day)
              const dayColor = getDayColor(priceData)

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square p-1 rounded-lg border ${dayColor} ${
                    isToday(day) ? "ring-2 ring-cyan-500" : ""
                  } hover:bg-accent/50 transition-colors cursor-pointer`}
                >
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${isToday(day) ? "text-cyan-400" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {priceData?.demand_level === "peak" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1 py-0 bg-orange-500/20 text-orange-400 border-orange-500"
                        >
                          Peak
                        </Badge>
                      )}
                    </div>

                    {priceData && (
                      <div className="flex-1 flex flex-col justify-end text-[10px] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Ours:</span>
                          <span className="font-medium">${priceData.our_price}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Comp:</span>
                          <span>${priceData.avg_competitor_price}</span>
                        </div>
                        {priceData.recommended_price && priceData.recommended_price !== priceData.our_price && (
                          <div className="flex items-center justify-between pt-0.5 border-t border-border/50">
                            {getRecommendationIcon(priceData)}
                            <span className="font-bold text-cyan-400">${priceData.recommended_price}</span>
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

      {/* Selected Day Details */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-lg">Price Recommendations Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {hotelPrices
              .filter((p) => p.recommended_price && p.our_price && p.recommended_price !== p.our_price)
              .slice(0, 10)
              .map((price) => (
                <div
                  key={price.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    {getRecommendationIcon(price)}
                    <div>
                      <div className="font-medium">{format(new Date(price.date), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground">{price.price_recommendation}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      ${price.our_price} → <span className="text-cyan-400 font-bold">${price.recommended_price}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Competitors: ${price.min_competitor_price} - ${price.max_competitor_price}
                    </div>
                  </div>
                </div>
              ))}
            {hotelPrices.filter((p) => p.recommended_price && p.our_price && p.recommended_price !== p.our_price)
              .length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No price recommendations available. Generate calendar data first.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
