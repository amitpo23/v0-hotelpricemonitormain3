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
      .from("price_predictions")
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
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
                AI Price Predictions
              </h1>
              <p className="text-gray-300 text-lg">
                Generate and analyze AI-powered hotel price predictions
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <a 
                href="/predictions/revenue-impact"
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                💰 תחזית השפעה על הכנסות
              </a>

              <a 
                href="/budget/analysis"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Budget Analysis
              </a>
              
              <a 
                href="/autopilot/tools"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Autopilot Tools
              </a>
            </div>
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
