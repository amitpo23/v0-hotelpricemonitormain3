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
} from "@/components/icons"
import { PredictionChart } from "./prediction-chart"
import { GeneratePredictionsButton } from "./generate-button"
import { YearlyPredictions } from "./yearly-predictions"
import { MarketIntelligence } from "./market-intelligence"
import { PredictionChat } from "./prediction-chat"
import { RevenueForecast } from "./revenue-forecast"

export default async function PredictionsPage() {
  const supabase = await createClient()

  const [{ data: predictions }, { data: hotels }, { data: roomTypes }, { data: budgets }, { data: forecasts }] =
    await Promise.all([
      supabase
        .from("price_predictions")
        .select("*, hotels (name)")
        .order("prediction_date", { ascending: true })
        .gte("prediction_date", new Date().toISOString().split("T")[0]),
      supabase.from("hotels").select("id, name, base_price, location, total_rooms"),
      supabase.from("hotel_room_types").select("*").eq("is_active", true),
      supabase.from("revenue_budgets").select("*"),
      supabase.from("monthly_forecasts").select("*").eq("year", new Date().getFullYear()),
    ])

  const getDemandColor = (demand: string | null) => {
    switch (demand) {
      case "very_high":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <TargetIcon className="h-10 w-10 text-purple-500" />
            AI Price Predictions
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            AI-powered demand forecasting with market intelligence - includes room type analysis
          </p>
        </div>
        <GeneratePredictionsButton hotels={hotels || []} />
      </div>

      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Daily
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <DollarSignIcon className="h-4 w-4" />
            Revenue
          </TabsTrigger>
          <TabsTrigger value="monthly" className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4" />
            Monthly
          </TabsTrigger>
          <TabsTrigger value="market" className="flex items-center gap-2">
            <GlobeIcon className="h-4 w-4" />
            Market Intel
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquareIcon className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
        </TabsList>

        {/* Daily Predictions Tab */}
        <TabsContent value="daily" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Price Forecast</CardTitle>
              <CardDescription>
                Predicted optimal prices based on demand analysis and market intelligence
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
                <h3 className="text-xl font-semibold mb-2">No predictions yet</h3>
                <p className="text-slate-500 mb-6">Generate AI predictions to see optimal pricing for your hotels</p>
                <GeneratePredictionsButton hotels={hotels || []} />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(predictionsByHotel).map(([hotelId, data]: [string, any]) => (
                <Card key={hotelId}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-blue-500" />
                      {data.hotelName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {data.predictions.slice(0, 14).map((pred: any) => (
                        <div key={pred.id} className={`p-3 rounded-lg border ${getDemandColor(pred.predicted_demand)}`}>
                          <div className="text-xs font-medium mb-1">
                            {new Date(pred.prediction_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-xl font-bold">${pred.predicted_price}</div>
                          <div className="text-xs capitalize mt-1">{pred.predicted_demand || "medium"} demand</div>
                          {pred.confidence_score && (
                            <div className="text-xs opacity-75 mt-1">
                              {(pred.confidence_score * 100).toFixed(0)}% conf.
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {data.predictions[0]?.factors && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Factors Considered:</div>
                        <div className="flex flex-wrap gap-2">
                          {data.predictions[0].factors.seasonality && (
                            <Badge variant="outline">Seasonality: {data.predictions[0].factors.seasonality}</Badge>
                          )}
                          {data.predictions[0].factors.competitor_avg && (
                            <Badge variant="outline">
                              Competitor Avg: ${data.predictions[0].factors.competitor_avg}
                            </Badge>
                          )}
                          {data.predictions[0].factors.market_trend && (
                            <Badge variant="outline" className="bg-blue-50">
                              Market: {data.predictions[0].factors.market_trend}
                            </Badge>
                          )}
                          {data.predictions[0].factors.google_trend && (
                            <Badge variant="outline" className="bg-green-50">
                              Google Trend: {data.predictions[0].factors.google_trend}
                            </Badge>
                          )}
                          {data.predictions[0].factors.events?.map((event: string, i: number) => (
                            <Badge key={i} variant="outline" className="bg-purple-50">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
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
