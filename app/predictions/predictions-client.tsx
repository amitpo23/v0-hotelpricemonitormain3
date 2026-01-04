"use client"

import { useState } from "react"
import type { Prediction, Hotel, SessionInfo } from "./page"
import { PredictionLogViewer } from "@/components/prediction-log-viewer"
import { GenerationLogsViewer } from "@/components/generation-logs-viewer"
import { ConfidenceBadge } from "@/components/confidence-badge"
import { MetricsGlossary } from "@/components/metrics-glossary"
import { FileText, ScrollText, Clock, Calendar } from "lucide-react"

interface Props {
  initialPredictions: Prediction[]
  hotels: Hotel[]
  sessionInfo: SessionInfo | null
}

export default function PredictionsClient({ initialPredictions, hotels, sessionInfo }: Props) {
  const [predictions, setPredictions] = useState(initialPredictions)
  const [selectedYear, setSelectedYear] = useState(2026)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([1])
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState("")
  const [generationSessionId, setGenerationSessionId] = useState<string | null>(null)
  const [showGenerationLogs, setShowGenerationLogs] = useState(false)
  
  // Log viewer state
  const [logViewerOpen, setLogViewerOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<{
    hotelId: string
    predictionDate: string
    hotelName: string
  } | null>(null)

  // Filter state
  const [filterHotel, setFilterHotel] = useState("")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterMinConfidence, setFilterMinConfidence] = useState(0)

  const handleViewLog = (hotelId: string, predictionDate: string) => {
    const hotel = hotels.find(h => h.id === hotelId)
    setSelectedLog({
      hotelId,
      predictionDate,
      hotelName: hotel?.name || hotelId
    })
    setLogViewerOpen(true)
  }

  const handleGeneratePredictions = async () => {
    setIsGenerating(true)
    setMessage("")
    setShowGenerationLogs(true) // Show logs immediately
    
    try {
      const response = await fetch('/api/predictions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedYear,
          selectedMonths
        })
      })     
      const data = await response.json()
      
      if (response.ok) {
        setGenerationSessionId(data.sessionId) // Store session ID for tracking
        setMessage(`✅ נוצרו ${data.count || 0} חיזויים בהצלחה!`)
        
        // Don't reload immediately - let user see the logs
        setTimeout(() => {
          if (confirm('רענן את הדף כדי לראות את החיזויים החדשים?')) {
            window.location.reload()
          }
        }, 2000)
      } else {
        setMessage(`❌ שגיאה: ${data.error || "Failed to generate predictions"}`)
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleMonth = (month: number) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month))
    } else {
      setSelectedMonths([...selectedMonths, month].sort((a, b) => a - b))
    }
  }

  // Helper to get month names
  const getMonthNames = (months: number[]) => {
    const monthNames = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ']
    return months.map(m => monthNames[m - 1]).join(', ')
  }

  // Filter predictions - only show 2026 and later
  const filteredPredictions = predictions.filter(pred => {
    // Hide predictions from 2025 and earlier
    if (pred.prediction_date && pred.prediction_date < '2026-01-01') return false
    
    if (filterHotel && pred.hotel_id !== filterHotel) return false
    if (filterStartDate && pred.prediction_date && pred.prediction_date < filterStartDate) return false
    if (filterEndDate && pred.prediction_date && pred.prediction_date > filterEndDate) return false
    if (filterMinConfidence && pred.confidence_score && pred.confidence_score < filterMinConfidence) return false
    return true
  })

  return (
    <div className="space-y-8">
      {/* Generate Predictions Form */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Generate New Predictions</h2>
          <MetricsGlossary />
        </div>
        
        <div className="space-y-4">
          {/* Year Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Year</label>
            <div className="flex gap-4">
              {[2026, 2027].map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedYear === year
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          {/* Month Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Months</label>
            <div className="grid grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <button
                  key={month}
                  onClick={() => toggleMonth(month)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMonths.includes(month)
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGeneratePredictions}
            disabled={isGenerating || selectedMonths.length === 0}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold text-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isGenerating 
              ? "מייצר חיזויים..." 
              : selectedMonths.length > 0
                ? `ייצר חיזויים עבור ${selectedMonths.length} חודשים: ${getMonthNames(selectedMonths)}`
                : "בחר לפחות חודש אחד"
            }
          </button>

          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes("Error") ? "bg-red-900 text-red-200" : "bg-green-900 text-green-200"
            }`}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Generation Logs - Show during and after generation */}
      {showGenerationLogs && generationSessionId && (
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ScrollText className="w-5 h-5" />
              לוג ייצור חיזויים
            </h3>
            <button
              onClick={() => setShowGenerationLogs(false)}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
            >
              הסתר
            </button>
          </div>
          <GenerationLogsViewer 
            sessionId={generationSessionId}
            autoRefresh={isGenerating}
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
        <h2 className="text-2xl font-bold mb-6 text-white">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Hotel Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Hotel</label>
            <select
              value={filterHotel}
              onChange={(e) => setFilterHotel(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Hotels</option>
              {hotels.map(hotel => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name || hotel.id}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Confidence Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Min Confidence</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={filterMinConfidence}
              onChange={(e) => setFilterMinConfidence(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={() => {
            setFilterHotel("")
            setFilterStartDate("")
            setFilterEndDate("")
            setFilterMinConfidence(0)
          }}
          className="mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
        >
          Clear Filters
        </button>
      </div>

      {/* Predictions Table */}
      <div className="bg-gray-800 rounded-lg p-6 shadow-xl overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            Predictions ({filteredPredictions.length})
          </h2>
          
          {/* Session Info with Timestamp */}
          {sessionInfo && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Clock className="w-4 h-4" />
                <span>חיזוי אחרון:</span>
                <span className="font-mono text-blue-400">
                  {new Date(sessionInfo.created_at).toLocaleString('he-IL', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                <span>Session:</span>
                <span className="font-mono">{sessionInfo?.session_id?.slice(0, 12) || 'N/A'}...</span>
              </div>
            </div>
          )}
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Date</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Hotel</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Predicted Price</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Confidence</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Demand</th>
              <th className="text-left py-3 px-4 text-gray-300 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPredictions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
                  No predictions found. Try adjusting your filters or generate new predictions.
                </td>
              </tr>
            ) : (
              filteredPredictions.map((pred, idx) => (
                <tr key={pred.id || idx} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="py-3 px-4 text-white">
                    {pred.prediction_date || "N/A"}
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {hotels.find(h => h.id === pred.hotel_id)?.name || pred.hotel_id || "N/A"}
                  </td>
                  <td className="py-3 px-4 text-green-400 font-semibold" dir="rtl">
                    ₪{pred.predicted_price?.toFixed(0) || "N/A"}
                  </td>
                  <td className="py-3 px-4">
                    <ConfidenceBadge 
                      confidence={(pred.confidence_score || 0) * 100} 
                      size="sm"
                    />
                  </td>
                  <td className="py-3 px-4 text-gray-300">
                    {pred.predicted_demand || "N/A"}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => pred.hotel_id && pred.prediction_date && handleViewLog(pred.hotel_id, pred.prediction_date)}
                      disabled={!pred.hotel_id || !pred.prediction_date}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                      title="View detailed decision logs"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Logs</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Log Viewer Dialog */}
      {selectedLog && (
        <PredictionLogViewer
          hotelId={selectedLog.hotelId}
          predictionDate={selectedLog.predictionDate}
          hotelName={selectedLog.hotelName}
          open={logViewerOpen}
          onOpenChange={setLogViewerOpen}
        />
      )}
    </div>
  )
}