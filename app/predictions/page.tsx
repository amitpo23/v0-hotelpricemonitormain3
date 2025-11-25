import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, Calendar, Sparkles } from "lucide-react"
import { PredictionChart } from "./prediction-chart"
import { GeneratePredictionsButton } from "./generate-button"

export default async function PredictionsPage() {
  const supabase = await createClient()

  const [{ data: predictions }, { data: hotels }] = await Promise.all([
    supabase
      .from("price_predictions")
      .select("*, hotels (name)")
      .order("prediction_date", { ascending: true })
      .gte("prediction_date", new Date().toISOString().split("T")[0]),
    supabase.from("hotels").select("id, name, base_price"),
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

  // Group predictions by hotel
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
            <Target className="h-10 w-10 text-purple-500" />
            Price Predictions
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            AI-powered demand forecasting and optimal pricing suggestions
          </p>
        </div>
        <GeneratePredictionsButton hotels={hotels || []} />
      </div>

      {/* Prediction Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>30-Day Price Forecast</CardTitle>
          <CardDescription>Predicted optimal prices based on demand analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <PredictionChart predictions={predictions || []} />
        </CardContent>
      </Card>

      {/* Predictions by Hotel */}
      {Object.keys(predictionsByHotel).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-16 w-16 text-slate-300 mx-auto mb-4" />
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
                  <Calendar className="h-5 w-5 text-blue-500" />
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
                        <div className="text-xs opacity-75 mt-1">{(pred.confidence_score * 100).toFixed(0)}% conf.</div>
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
                        <Badge variant="outline">Competitor Avg: ${data.predictions[0].factors.competitor_avg}</Badge>
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
    </div>
  )
}
