import { createClient } from "@/lib/supabase/server"

// Types for predictions
type Prediction = {
  id: string
  hotel_id: string | null
  prediction_date: string | null
  predicted_price: number | null
  confidence_score: number | null
}

export default async function PredictionsPage() {
  const supabase = await createClient()

  // Fetch predictions with proper null handling
  const { data: predictions, error } = await supabase
    .from("price_predictions")
    .select("id, hotel_id, prediction_date, predicted_price, confidence_score")
    .order("prediction_date", { ascending: true })
    .limit(100)

  // Format date safely
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A"
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "Invalid Date"
    }
  }

  // Format price safely
  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return "N/A"
    return `$${price.toFixed(2)}`
  }

  // Format confidence safely
  const formatConfidence = (confidence: number | null) => {
    if (confidence === null || confidence === undefined) return "N/A"
    return `${(confidence * 100).toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Price Predictions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered price predictions from the database
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error Loading Predictions</h3>
            <p className="text-red-700 dark:text-red-300 text-sm">{error.message}</p>
          </div>
        )}

        {/* Stats */}
        {predictions && predictions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Predictions</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {predictions.length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Price</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatPrice(
                  predictions.reduce((sum, p) => sum + (p.predicted_price || 0), 0) / predictions.length
                )}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Confidence</div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {formatConfidence(
                  predictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / predictions.length
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!predictions || predictions.length === 0) && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No Predictions Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no predictions in the database yet. Generate some predictions to see them here.
            </p>
          </div>
        )}

        {/* Predictions Table */}
        {predictions && predictions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Predicted Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Hotel ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {predictions.map((prediction) => (
                    <tr
                      key={prediction.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDate(prediction.prediction_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                          {formatPrice(prediction.predicted_price)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            (prediction.confidence_score || 0) >= 0.8
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : (prediction.confidence_score || 0) >= 0.6
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {formatConfidence(prediction.confidence_score)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {prediction.hotel_id ? prediction.hotel_id.substring(0, 8) + "..." : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {predictions.length} prediction{predictions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
