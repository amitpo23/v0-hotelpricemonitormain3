import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TargetIcon,
  CalendarIcon,
  SparklesIcon,
  TrendingUpIcon,
  GlobeIcon,
  MessageSquareIcon,
  DollarSignIcon,
  BedDoubleIcon,
  UsersIcon,
} from "@/components/icons"
import { PredictionChart } from "./prediction-chart"
import { GeneratePredictionsButton } from "./generate-button"
import { YearlyPredictions } from "./yearly-predictions"
import { MarketIntelligence } from "./market-intelligence"
import { PredictionChat } from "./prediction-chat"
import { RevenueForecast } from "./revenue-forecast"

export default async function PredictionsPage() {
  const supabase = await createClient()

  const [
    { data: predictions },
    { data: hotels },
    { data: roomTypes },
    { data: budgets },
    { data: forecasts },
    { data: bookings },
  ] = await Promise.all([
    supabase
      .from("price_predictions")
      .select("*, hotels (name)")
      .order("prediction_date", { ascending: true })
      .gte("prediction_date", new Date().toISOString().split("T")[0]),
    supabase.from("hotels").select("id, name, base_price, location, total_rooms"),
    supabase.from("hotel_room_types").select("*").eq("is_active", true),
    supabase.from("revenue_budgets").select("*"),
    supabase.from("monthly_forecasts").select("*").eq("year", new Date().getFullYear()),
    supabase
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("check_in_date", new Date().toISOString().split("T")[0]),
  ])

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

  const predictionsByHotel =
    predictions?.reduce((acc: any, pred: any) => {
      const hotelId = pred.hotel_id
      if (!acc[hotelId]) {
        acc[hotelId] = {
          hotelName: pred.hotels?.name || "Unknown",
          predictions: [],
        }
      }
      acc[hotelId].predictions.push(pred)
      return acc
    }, {}) || {}

  const getOccupancyForHotel = (hotelId: string) => {
    const hotelBookings = bookings?.filter((b) => b.hotel_id === hotelId) || []
    const hotel = hotels?.find((h) => h.id === hotelId)
    const totalRooms = hotel?.total_rooms || 50
    const today = new Date().toISOString().split("T")[0]

    // Count rooms booked for today
    let bookedToday = 0
    hotelBookings.forEach((b) => {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <TargetIcon className="h-10 w-10 text-purple-500" />
            AI Price Predictions / חיזוי מחירים
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            AI-powered demand forecasting with market intelligence - מתחשב בתפוסה, תקציב ונתוני שוק
          </p>
        </div>
        <GeneratePredictionsButton hotels={hotels || []} />
      </div>

      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Daily / יומי
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4" />
            Revenue / הכנסות
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4" />
            Monthly / חודשי
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4" />
            Market Intel / שוק
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquareIcon className="h-4 w-4" />
            AI Chat / צ'אט
          </TabsTrigger>
        </TabsList>

        {/* Daily Predictions Tab */}
        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Price Forecast / חיזוי 30 יום</CardTitle>
              <CardDescription>
                Predicted optimal prices based on demand, occupancy, budget and market data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PredictionChart predictions={predictions || []} />
            </CardContent>
          </Card>

          {Object.keys(predictionsByHotel).length === 0 ? (
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
              {Object.entries(predictionsByHotel).map(([hotelId, data]: [string, any]) => {
                const hotel = hotels?.find((h: any) => h.id === hotelId)
                const basePrice = hotel?.base_price || 0
                const occupancy = getOccupancyForHotel(hotelId)

                return (
                  <Card key={hotelId}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-blue-500" />
                            {data.hotelName}
                          </CardTitle>
                          {basePrice > 0 && (
                            <CardDescription className="mt-1">
                              Current base price: <span className="font-semibold text-cyan-500">₪{basePrice}</span>
                              /night
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-4">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">Today Occupancy / תפוסה היום</div>
                            <div className="text-lg font-semibold text-cyan-500 flex items-center gap-1 justify-center">
                              <BedDoubleIcon className="h-4 w-4" />
                              {occupancy.occupancyRate}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {occupancy.bookedToday}/{occupancy.totalRooms} rooms
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">Avg. Confidence</div>
                            <div className="text-lg font-semibold text-purple-500">
                              {(
                                (data.predictions.reduce((sum: number, p: any) => sum + (p.confidence_score || 0), 0) /
                                  data.predictions.length) *
                                100
                              ).toFixed(0)}
                              %
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                        {data.predictions.slice(0, 14).map((pred: any) => {
                          const priceDiff =
                            basePrice > 0 ? (((pred.predicted_price - basePrice) / basePrice) * 100).toFixed(0) : null
                          const confidencePercent = (pred.confidence_score * 100).toFixed(0)

                          return (
                            <div
                              key={pred.id}
                              className={`p-3 rounded-lg border ${getDemandColor(pred.predicted_demand)}`}
                            >
                              <div className="text-xs font-medium mb-1">
                                {new Date(pred.prediction_date).toLocaleDateString("he-IL", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                              <div className="text-xl font-bold">₪{pred.predicted_price}</div>
                              {priceDiff && (
                                <div
                                  className={`text-xs ${Number(priceDiff) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
                                >
                                  {Number(priceDiff) >= 0 ? "+" : ""}
                                  {priceDiff}% vs base
                                </div>
                              )}
                              <div className="text-xs capitalize mt-1">
                                {(pred.predicted_demand || "medium").replace("_", " ")} Demand
                              </div>
                              {pred.factors?.occupancy_rate !== undefined && (
                                <div className="text-xs mt-1 flex items-center gap-1">
                                  <UsersIcon className="h-3 w-3" />
                                  {pred.factors.occupancy_rate}% occ
                                </div>
                              )}
                              <div
                                className={`text-xs mt-1 font-medium ${
                                  Number(confidencePercent) >= 80
                                    ? "text-green-700 dark:text-green-400"
                                    : Number(confidencePercent) >= 65
                                      ? "text-yellow-700 dark:text-yellow-400"
                                      : "text-orange-700 dark:text-orange-400"
                                }`}
                              >
                                {confidencePercent}% conf.
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {basePrice > 0 && (
                        <div className="mt-4 pt-4 border-t flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <DollarSignIcon className="h-5 w-5 text-cyan-500" />
                            <span className="text-sm text-slate-300">Current Hotel Price:</span>
                            <span className="text-lg font-bold text-cyan-400">₪{basePrice}</span>
                            <span className="text-sm text-slate-400">/night</span>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400">Predicted Range / טווח חיזוי</div>
                            <div className="text-sm font-medium">
                              ₪{Math.min(...data.predictions.slice(0, 14).map((p: any) => p.predicted_price))} - ₪
                              {Math.max(...data.predictions.slice(0, 14).map((p: any) => p.predicted_price))}
                            </div>
                          </div>
                        </div>
                      )}

                      {data.predictions[0]?.factors && (
                        <div className="mt-4 pt-4 border-t">
                          <div className="text-sm font-medium mb-2">Factors Considered / גורמים שנבדקו:</div>
                          <div className="flex flex-wrap gap-2">
                            {data.predictions[0].factors.seasonality && (
                              <Badge variant="outline">Seasonality: {data.predictions[0].factors.seasonality}</Badge>
                            )}
                            {data.predictions[0].factors.competitor_avg && (
                              <Badge variant="outline">
                                Competitor Avg: ₪{data.predictions[0].factors.competitor_avg}
                              </Badge>
                            )}
                            {data.predictions[0].factors.occupancy_rate !== undefined && (
                              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                                Occupancy / תפוסה: {data.predictions[0].factors.occupancy_rate}%
                              </Badge>
                            )}
                            {data.predictions[0].factors.budget_gap !== undefined &&
                              data.predictions[0].factors.budget_gap !== 0 && (
                                <Badge
                                  variant="outline"
                                  className={
                                    data.predictions[0].factors.budget_gap > 0
                                      ? "bg-red-50 dark:bg-red-950"
                                      : "bg-green-50 dark:bg-green-950"
                                  }
                                >
                                  Budget Gap: {data.predictions[0].factors.budget_gap > 0 ? "-" : "+"}₪
                                  {Math.abs(data.predictions[0].factors.budget_gap).toLocaleString()}
                                </Badge>
                              )}
                            {data.predictions[0].factors.budget_pressure &&
                              data.predictions[0].factors.budget_pressure !== "1.00" && (
                                <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">
                                  Budget Pressure: {data.predictions[0].factors.budget_pressure}x
                                </Badge>
                              )}
                            {data.predictions[0].factors.lead_time_factor && (
                              <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950">
                                Lead Time: {data.predictions[0].factors.lead_time_factor}x
                              </Badge>
                            )}
                            {data.predictions[0].factors.events?.map((event: string, i: number) => (
                              <Badge key={i} variant="outline" className="bg-purple-50 dark:bg-purple-950">
                                {event}
                              </Badge>
                            ))}
                          </div>
                          {data.predictions[0].factors.confidence_breakdown && (
                            <div className="mt-3 pt-3 border-t border-dashed">
                              <div className="text-xs text-muted-foreground mb-2">
                                Confidence Breakdown / פירוט ביטחון:
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {Object.entries(data.predictions[0].factors.confidence_breakdown).map(
                                  ([key, value]: [string, any]) => (
                                    <span key={key} className="bg-slate-700/50 px-2 py-1 rounded">
                                      {key.replace(/_/g, " ")}: {value}
                                    </span>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueForecast
            hotels={hotels || []}
            budgets={budgets || []}
            forecasts={forecasts || []}
            roomTypes={roomTypes || []}
          />
        </TabsContent>

        {/* Monthly Predictions Tab */}
        <TabsContent value="monthly">
          <YearlyPredictions hotels={hotels || []} roomTypes={roomTypes || []} />
        </TabsContent>

        {/* Market Intelligence Tab */}
        <TabsContent value="market">
          <MarketIntelligence hotels={hotels || []} />
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="chat">
          <PredictionChat predictions={predictions || []} hotels={hotels || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
