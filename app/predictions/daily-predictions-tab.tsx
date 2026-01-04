"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SparklesIcon, CalendarIcon, DollarSignIcon, TrendingUpIcon, AlertTriangleIcon } from "@/components/icons"
import { PredictionChart } from "./prediction-chart"
import { GeneratePredictionsButton } from "./generate-button"
import { EnhancedPredictionCard } from "./enhanced-prediction-card"

interface RequestedParams {
  selectedMonths: number[]
  selectedYear: number
  daysAhead: number
  generatedAt: string
}

interface DailyPredictionsTabProps {
  predictions: any[]
  hotels: any[]
  competitorPrices: any[]
  recommendations: any[]
  predictionsByHotel: Record<string, any>
  bookings: any[]
}

/**
 * Client-side component for the daily predictions tab that filters predictions
 * based on what the user actually requested.
 */
export function DailyPredictionsTab({
  predictions,
  hotels,
  competitorPrices,
  recommendations,
  predictionsByHotel,
  bookings,
}: DailyPredictionsTabProps) {
  const [filteredPredictions, setFilteredPredictions] = useState(predictions)
  const [filteredRecommendations, setFilteredRecommendations] = useState(recommendations)
  const [filteredByHotel, setFilteredByHotel] = useState(predictionsByHotel)
  const [requestedInfo, setRequestedInfo] = useState<string | null>(null)

  useEffect(() => {
    // Get the requested parameters from localStorage
    const requestedParamsStr = localStorage.getItem("predictions_requested_params")
    
    if (!requestedParamsStr || !predictions || predictions.length === 0) {
      // No filter params or no predictions - show all
      setFilteredPredictions(predictions)
      setFilteredRecommendations(recommendations)
      setFilteredByHotel(predictionsByHotel)
      setRequestedInfo(null)
      return
    }

    try {
      const params: RequestedParams = JSON.parse(requestedParamsStr)
      
      // Calculate the date range based on requested months
      if (params.selectedMonths && params.selectedMonths.length > 0 && params.selectedYear) {
        const earliestMonth = Math.min(...params.selectedMonths)
        const latestMonth = Math.max(...params.selectedMonths)
        
        // Start date: first day of earliest month
        const startDate = new Date(params.selectedYear, earliestMonth - 1, 1)
        
        // End date: last day of latest month  
        const endDate = new Date(params.selectedYear, latestMonth, 0)
        
        // Filter predictions to only those within the requested date range
        const filtered = predictions.filter((pred: any) => {
          const predDate = new Date(pred.prediction_date)
          return predDate >= startDate && predDate <= endDate
        })
        
        // Filter recommendations
        const filteredRecs = recommendations.filter((rec: any) => {
          const recDate = new Date(rec.prediction_date || rec.date)
          return recDate >= startDate && recDate <= endDate
        })
        
        // Rebuild predictionsByHotel with filtered data
        const newPredsByHotel = filtered.reduce((acc: any, pred: any) => {
          const hotelId = pred.hotel_id
          if (!acc[hotelId]) {
            acc[hotelId] = {
              hotelName: pred.hotels?.name || "Unknown",
              predictions: [],
            }
          }
          acc[hotelId].predictions.push(pred)
          return acc
        }, {})
        
        const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]
        const monthsStr = params.selectedMonths.map(m => monthNames[m - 1]).join(", ")
        
        console.log("[DailyPredictionsTab] Filtering:", {
          total: predictions.length,
          filtered: filtered.length,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          requestedMonths: params.selectedMonths,
          requestedYear: params.selectedYear
        })
        
        setFilteredPredictions(filtered)
        setFilteredRecommendations(filteredRecs)
        setFilteredByHotel(newPredsByHotel)
        setRequestedInfo(`מוצג: ${monthsStr} ${params.selectedYear} (${filtered.length} ימים)`)
      } else if (params.daysAhead) {
        // If using daysAhead instead of months, filter by days from today
        const today = new Date()
        const endDate = new Date(today)
        endDate.setDate(endDate.getDate() + params.daysAhead)
        
        const filtered = predictions.filter((pred: any) => {
          const predDate = new Date(pred.prediction_date)
          return predDate >= today && predDate <= endDate
        })
        
        const filteredRecs = recommendations.filter((rec: any) => {
          const recDate = new Date(rec.prediction_date || rec.date)
          return recDate >= today && recDate <= endDate
        })
        
        const newPredsByHotel = filtered.reduce((acc: any, pred: any) => {
          const hotelId = pred.hotel_id
          if (!acc[hotelId]) {
            acc[hotelId] = {
              hotelName: pred.hotels?.name || "Unknown",
              predictions: [],
            }
          }
          acc[hotelId].predictions.push(pred)
          return acc
        }, {})
        
        console.log("[DailyPredictionsTab] Filtering by daysAhead:", {
          total: predictions.length,
          filtered: filtered.length,
          daysAhead: params.daysAhead
        })
        
        setFilteredPredictions(filtered)
        setFilteredRecommendations(filteredRecs)
        setFilteredByHotel(newPredsByHotel)
        setRequestedInfo(`מוצג: ${params.daysAhead} ימים קדימה (${filtered.length} ימים)`)
      } else {
        // No valid filter params - show all
        setFilteredPredictions(predictions)
        setFilteredRecommendations(recommendations)
        setFilteredByHotel(predictionsByHotel)
        setRequestedInfo(null)
      }
    } catch (error) {
      console.error("[DailyPredictionsTab] Error parsing requested params:", error)
      // On error, show all predictions
      setFilteredPredictions(predictions)
      setFilteredRecommendations(recommendations)
      setFilteredByHotel(predictionsByHotel)
      setRequestedInfo(null)
    }
  }, [predictions, recommendations, predictionsByHotel])

  // Helper function to get occupancy for a hotel
  const getOccupancyForHotel = (hotelId: string) => {
    const hotelBookings = bookings?.filter((b: any) => b.hotel_id === hotelId) || []
    const hotel = hotels?.find((h: any) => h.id === hotelId)
    const totalRooms = hotel?.total_rooms || 50
    const today = new Date().toISOString().split("T")[0]

    let bookedToday = 0
    hotelBookings.forEach((b: any) => {
      if (b.check_in_date <= today && b.check_out_date > today) {
        bookedToday += b.room_count || 1
      }
    })

    return {
      bookedToday,
      totalRooms,
      occupancyRate: Math.round((bookedToday / totalRooms) * 100),
      futureBookings: hotelBookings.length,
    }
  }

  // Helper function to get demand color
  const getDemandColor = (demand: string | null) => {
    switch (demand) {
      case "very_high":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700"
      case "low":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
  }

  return (
    <div className="space-y-6">
      {/* Show filter info if active */}
      {requestedInfo && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-blue-600 dark:text-blue-400">{requestedInfo}</span>
              <Badge variant="secondary" className="mr-2">
                סה"כ {filteredPredictions.length} חיזויים
              </Badge>
              <span className="text-xs text-muted-foreground">
                (חיזויים נוספים נשמרים ברקע למטרות ניתוח)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Prediction Engine */}
      {hotels && hotels.length > 0 && (
        <EnhancedPredictionCard 
          hotelId={hotels[0].id} 
        />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Price Forecast / חיזוי מחירים</CardTitle>
          <CardDescription>
            Predicted optimal prices based on demand, occupancy, budget, competitor data and market intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PredictionChart predictions={filteredPredictions || []} competitorPrices={competitorPrices || []} />
        </CardContent>
      </Card>

      {Object.keys(filteredByHotel).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <SparklesIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No predictions yet / אין חיזויים עדיין</h3>
            <p className="text-slate-500 mb-6">Generate AI predictions to see optimal pricing for your hotels</p>
            <GeneratePredictionsButton hotels={hotels || []} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredByHotel).map(([hotelId, data]: [string, any]) => {
            const hotel = hotels?.find((h: any) => h.id === hotelId)
            const basePrice = hotel?.base_price || 0
            const occupancy = getOccupancyForHotel(hotelId)

            return (
              <Card key={hotelId} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <DollarSignIcon className="h-5 w-5 text-cyan-500" />
                        {data.hotelName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Base Price: ₪{basePrice} | {data.predictions.length} predictions
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Occupancy</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {occupancy.occupancyRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {occupancy.bookedToday}/{occupancy.totalRooms} rooms
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {data.predictions.slice(0, 30).map((pred: any, idx: number) => {
                      const priceChange = basePrice ? ((pred.predicted_price - basePrice) / basePrice) * 100 : 0
                      const isIncrease = priceChange > 0

                      return (
                        <Card
                          key={idx}
                          className={`${
                            pred.recommendation_type === "price_increase"
                              ? "bg-green-500/10 border-green-500/30"
                              : pred.recommendation_type === "promotion"
                                ? "bg-blue-500/10 border-blue-500/30"
                                : pred.recommendation_type === "price_floor"
                                  ? "bg-yellow-500/10 border-yellow-500/30"
                                  : "bg-slate-800/30 border-slate-700"
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-sm font-medium text-muted-foreground">
                                {new Date(pred.prediction_date).toLocaleDateString("he-IL", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                              <Badge variant="secondary" className={getDemandColor(pred.predicted_demand)}>
                                {pred.predicted_demand?.replace("_", " ")}
                              </Badge>
                            </div>

                            <div className="flex items-baseline gap-2 mb-2">
                              <div className="text-2xl font-bold">₪{Math.round(pred.predicted_price)}</div>
                              {basePrice && (
                                <div
                                  className={`text-sm font-medium flex items-center gap-1 ${isIncrease ? "text-green-500" : "text-red-500"}`}
                                >
                                  <TrendingUpIcon className={`h-3 w-3 ${!isIncrease && "rotate-180"}`} />
                                  {Math.abs(priceChange).toFixed(0)}%
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1 mb-2">
                              <div className="text-xs text-muted-foreground">Confidence:</div>
                              <div className="text-xs font-medium">{(pred.confidence_score * 100).toFixed(0)}%</div>
                            </div>

                            {pred.recommendation && (
                              <div className="flex items-start gap-1 text-xs">
                                <AlertTriangleIcon className="h-3 w-3 mt-0.5 flex-shrink-0 text-yellow-500" />
                                <div className="line-clamp-2">{pred.recommendation}</div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  {data.predictions.length > 30 && (
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      מציג 30 מתוך {data.predictions.length} חיזויים
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
