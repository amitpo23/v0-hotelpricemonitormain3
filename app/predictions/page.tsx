import { createClient } from "@/lib/supabase/server"
import PredictionsClient from "./predictions-client"
// Types for predictions
export type Prediction = {
  id: string
  hotel_id: string | null
  prediction_date: string | null
  predicted_price: number | null
  confidence_score: number | null
  predicted_demand: string | null
  recommendation: string | null
  created_at: string | null
}

export type Hotel = {
  id: string
  name: string | null
}

export default async function PredictionsPage() {
  try {
    const supabase = await createClient()

    // Fetch predictions with proper null handling
    const { data: predictions, error: predError } = await supabase
      .from("daily_prices")
      .select("id, hotel_id, prediction_date, predicted_price, confidence_score, predicted_demand, recommendation, created_at")
      .order("prediction_date", { ascending: false })
      .limit(500)

    // Fetch hotels for filter
    const { data: hotels, error: hotelError } = await supabase
      .from("hotels")
      .select("id, name")
      .order("name", { ascending: true })

    const error = predError || hotelError

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              AI Price Predictions
            </h1>
            <p className="text-gray-300 text-lg">
              Generate and analyze AI-powered hotel price predictions
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-red-300 font-semibold mb-2">⚠️ Error Loading Data</h3>
              <p className="text-red-200 text-sm">
                {error?.message || "An unknown error occurred"}
              </p>
            </div>
          )}

          {/* Client Component with Filters and Generate Form */}
          <PredictionsClient 
            initialPredictions={predictions || []} 
            hotels={hotels || []}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error in PredictionsPage:", error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 flex items-center justify-center">
        <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-lg p-8 max-w-md">
          <h3 className="text-red-300 font-semibold mb-2 text-xl">⚠️ Critical Error</h3>
          <p className="text-red-200">
            {error instanceof Error ? error.message : "Failed to load predictions page"}
          </p>
        </div>
      </div>
    )
  }
}
