"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { calculateRevenue } from "@/lib/calculations/revenue-calculator"
import { MetricsGlossary, QuickHelp } from "@/components/metrics-glossary"
import { ArrowUpIcon, ArrowDownIcon, TrendingUpIcon, CalendarIcon, DollarSignIcon, TargetIcon, InfoIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

interface Hotel {
  id: string
  name: string
  base_price: number
  total_rooms: number
}

interface Prediction {
  id: string
  hotel_id: string
  prediction_date: string
  predicted_price: number
  confidence_score: number
  predicted_demand: string
  recommendation: string
}

interface RevenueImpactClientProps {
  hotels: Hotel[]
  predictions: Prediction[]
}

interface RevenueScenario {
  scenario: string
  description: string
  avgPrice: number
  avgOccupancy: number
  dailyRevenue: number
  periodRevenue: number
  difference: number
  percentChange: number
}

interface CalculationLog {
  timestamp: string
  step: string
  data: any
  formula?: string
  result?: any
}

export default function RevenueImpactClient({ hotels, predictions }: RevenueImpactClientProps) {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [timeRange, setTimeRange] = useState(30) // days
  const [scenarios, setScenarios] = useState<RevenueScenario[]>([])
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationLogs, setCalculationLogs] = useState<CalculationLog[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [dataSources, setDataSources] = useState<any>(null)

  useEffect(() => {
    if (selectedHotel) {
      calculateScenarios()
    }
  }, [selectedHotel, timeRange, predictions])

  const addLog = (step: string, data: any, formula?: string, result?: any) => {
    const log: CalculationLog = {
      timestamp: new Date().toISOString(),
      step,
      data,
      formula,
      result
    }
    setCalculationLogs(prev => [...prev, log])
  }

  const calculateScenarios = async () => {
    if (!selectedHotel) return

    setIsCalculating(true)
    setCalculationLogs([]) // Clear previous logs

    try {
      addLog('🎯 Starting calculation', {
        hotel: selectedHotel.name,
        basePrice: selectedHotel.base_price,
        totalRooms: selectedHotel.total_rooms,
        timeRange: `${timeRange} days`
      })

      // Filter predictions for selected hotel and time range
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + timeRange)

      const hotelPredictions = predictions.filter(p => 
        p.hotel_id === selectedHotel.id &&
        new Date(p.prediction_date) >= today &&
        new Date(p.prediction_date) <= endDate
      )

      addLog('📊 Data filtering', {
        totalPredictions: predictions.length,
        filteredPredictions: hotelPredictions.length,
        dateRange: {
          from: today.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0]
        },
        predictedDates: hotelPredictions.map(p => p.prediction_date).slice(0, 5)
      })

      // Store data sources
      setDataSources({
        hotel: {
          name: selectedHotel.name,
          basePrice: selectedHotel.base_price,
          rooms: selectedHotel.total_rooms,
          source: 'Database: hotels table'
        },
        predictions: {
          count: hotelPredictions.length,
          avgPrice: hotelPredictions.length > 0 
            ? (hotelPredictions.reduce((sum, p) => sum + p.predicted_price, 0) / hotelPredictions.length).toFixed(2)
            : 'N/A',
          avgConfidence: hotelPredictions.length > 0
            ? (hotelPredictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / hotelPredictions.length).toFixed(1)
            : 'N/A',
          source: 'Database: price_predictions table (AI generated)'
        },
        assumptions: {
          baseOccupancy: '65%',
          manualAdjustment: '+10%',
          autopilotBoost: '+15% from confidence',
          source: 'Industry averages + ML model calculations'
        }
      })

      // Scenario 1: Current Strategy (base price)
      addLog('📈 Scenario 1: Current Strategy', {
        description: 'ממשיכים עם התמחור הקיים ללא שינויים',
        inputs: {
          price: selectedHotel.base_price,
          occupancy: 65,
          days: hotelPredictions.length || timeRange
        }
      })

      const currentScenario = calculateScenario(
        "שמירה על מחיר נוכחי",
        "ממשיכים עם התמחור הקיים ללא שינויים",
        selectedHotel.base_price,
        65,
        hotelPredictions.length || timeRange
      )

      addLog('✅ Scenario 1 result', currentScenario, 
        'Revenue = Price × (Occupancy/100) × Rooms × Days',
        { dailyRevenue: currentScenario.dailyRevenue, totalRevenue: currentScenario.periodRevenue }
      )

      // Scenario 2: Manual Adjustments (conservative +10%)
      addLog('📈 Scenario 2: Manual adjustments', {
        description: 'התאמות מחיר ידניות שמרניות',
        inputs: {
          basePrice: selectedHotel.base_price,
          adjustment: '+10%',
          newPrice: selectedHotel.base_price * 1.1,
          occupancy: 68,
          days: hotelPredictions.length || timeRange
        }
      })

      const manualScenario = calculateScenario(
        "שינויים ידניים מתונים",
        "התאמות מחיר ידניות שמרניות (+10% ממוצע)",
        selectedHotel.base_price * 1.1,
        68,
        hotelPredictions.length || timeRange
      )

      addLog('✅ Scenario 2 result', manualScenario,
        'Revenue = (Price × 1.1) × (Occupancy/100) × Rooms × Days',
        { dailyRevenue: manualScenario.dailyRevenue, totalRevenue: manualScenario.periodRevenue }
      )

      // Scenario 3: AI Predictions (from model)
      const avgPredictedPrice = hotelPredictions.length > 0
        ? hotelPredictions.reduce((sum, p) => sum + p.predicted_price, 0) / hotelPredictions.length
        : selectedHotel.base_price

      const avgDemand = hotelPredictions.length > 0
        ? calculateDemandOccupancy(hotelPredictions)
        : 65

      addLog('📈 Scenario 3: AI predictions', {
        description: 'שימוש בתחזיות המחיר של ה-AI',
        inputs: {
          predictionsUsed: hotelPredictions.length,
          avgPredictedPrice: avgPredictedPrice.toFixed(2),
          demandBreakdown: hotelPredictions.reduce((acc, p) => {
            const demand = p.predicted_demand || 'medium'
            acc[demand] = (acc[demand] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          calculatedOccupancy: avgDemand.toFixed(1)
        }
      })

      const aiScenario = calculateScenario(
        "תחזיות AI בלבד",
        "שימוש בתחזיות המחיר של ה-AI כפי שהן",
        avgPredictedPrice,
        avgDemand,
        hotelPredictions.length || timeRange
      )

      addLog('✅ Scenario 3 result', aiScenario,
        'Revenue = AvgAIPrice × (AICalculatedOccupancy/100) × Rooms × Days',
        { dailyRevenue: aiScenario.dailyRevenue, totalRevenue: aiScenario.periodRevenue }
      )

      // Scenario 4: Autopilot Full Implementation
      addLog('📈 Scenario 4: Autopilot (RECOMMENDED)', {
        description: 'אופטימיזציה דינמית של מחיר + תפוסה',
        approach: 'Dynamic pricing with confidence boost + demand optimization'
      })

      const autopilotScenario = calculateAutopilotScenario(
        hotelPredictions,
        selectedHotel
      )

      addLog('✅ Scenario 4 result', autopilotScenario,
        'Revenue = Σ(OptimizedPrice[i] × DynamicOccupancy[i] × Rooms) for each day',
        { dailyRevenue: autopilotScenario.dailyRevenue, totalRevenue: autopilotScenario.periodRevenue }
      )

      // Calculate differences compared to current
      addLog('🔄 Comparing scenarios', {
        baseline: currentScenario.periodRevenue,
        manual: manualScenario.periodRevenue,
        ai: aiScenario.periodRevenue,
        autopilot: autopilotScenario.periodRevenue
      })

      const scenarios = [
        { ...currentScenario, difference: 0, percentChange: 0 },
        {
          ...manualScenario,
          difference: manualScenario.periodRevenue - currentScenario.periodRevenue,
          percentChange: ((manualScenario.periodRevenue - currentScenario.periodRevenue) / currentScenario.periodRevenue) * 100
        },
        {
          ...aiScenario,
          difference: aiScenario.periodRevenue - currentScenario.periodRevenue,
          percentChange: ((aiScenario.periodRevenue - currentScenario.periodRevenue) / currentScenario.periodRevenue) * 100
        },
        {
          ...autopilotScenario,
          difference: autopilotScenario.periodRevenue - currentScenario.periodRevenue,
          percentChange: ((autopilotScenario.periodRevenue - currentScenario.periodRevenue) / currentScenario.periodRevenue) * 100
        }
      ]

      setScenarios(scenarios)
    } catch (error) {
      console.error("Error calculating scenarios:", error)
    } finally {
      setIsCalculating(false)
    }
  }

  const calculateScenario = (
    scenario: string,
    description: string,
    avgPrice: number,
    avgOccupancy: number,
    days: number
  ): Omit<RevenueScenario, 'difference' | 'percentChange'> => {
    const totalRooms = selectedHotel?.total_rooms || 35 // Updated default to Scarlet's actual rooms
    
    // Use centralized Revenue Calculator - Single Source of Truth
    const revenueCalc = calculateRevenue({
      price: avgPrice,
      rooms: totalRooms,
      occupancy: avgOccupancy,
      days: days
    })

    return {
      scenario,
      description,
      avgPrice: Math.round(avgPrice),
      avgOccupancy: Math.round(avgOccupancy * 10) / 10,
      dailyRevenue: revenueCalc.dailyRevenue,
      periodRevenue: revenueCalc.revenue,
      difference: 0,
      percentChange: 0
    }
  }

  const calculateAutopilotScenario = (
    predictions: Prediction[],
    hotel: Hotel
  ): Omit<RevenueScenario, 'difference' | 'percentChange'> => {
    // Autopilot optimizes both price AND occupancy
    let totalRevenue = 0
    let avgPrice = 0
    let avgOccupancy = 0
    const dayDetails: any[] = []

    predictions.forEach((pred, index) => {
      // Autopilot increases confidence and demand
      const confidenceBoost = (pred.confidence_score || 70) / 100
      const priceOptimized = pred.predicted_price * (1 + confidenceBoost * 0.15) // +15% max from confidence
      
      // Higher prices with dynamic adjustments = better occupancy
      const demandBoost = pred.predicted_demand === 'high' ? 1.2 : pred.predicted_demand === 'medium' ? 1.0 : 0.85
      const occupancy = Math.min(95, 65 * demandBoost * (1 + confidenceBoost * 0.1))
      
      // Use centralized Revenue Calculator for consistency
      const dayRevenueCalc = calculateRevenue({
        price: priceOptimized,
        rooms: hotel.total_rooms,
        occupancy: occupancy,
        days: 1
      })
      const dayRevenue = dayRevenueCalc.revenue

      // Log first 3 days as examples
      if (index < 3) {
        dayDetails.push({
          date: pred.prediction_date,
          basePrice: pred.predicted_price.toFixed(2),
          confidence: pred.confidence_score,
          confidenceBoost: (confidenceBoost * 100).toFixed(1) + '%',
          optimizedPrice: priceOptimized.toFixed(2),
          demand: pred.predicted_demand,
          demandBoost: demandBoost,
          occupancy: occupancy.toFixed(1) + '%',
          revenue: dayRevenue.toFixed(2),
          formula: dayRevenueCalc.formula
        })
      }
      
      avgPrice += priceOptimized
      avgOccupancy += occupancy
      totalRevenue += dayRevenue
    })

    const days = predictions.length
    avgPrice = days > 0 ? avgPrice / days : hotel.base_price
    avgOccupancy = days > 0 ? avgOccupancy / days : 65

    // Log the autopilot calculation details
    addLog('🤖 Autopilot day-by-day examples', {
      note: `Showing first 3 days out of ${days} total`,
      examples: dayDetails,
      formula: 'OptimizedPrice = AIPrice × (1 + Confidence × 0.15)',
      occupancyFormula: 'Occupancy = min(95, 65 × DemandBoost × (1 + Confidence × 0.1))',
      revenueFormula: 'Revenue = calculateRevenue() - Single Source of Truth'
    })

    return {
      scenario: "🚀 Autopilot מלא (מומלץ)",
      description: "אופטימיזציה דינמית של מחיר + תפוסה עם התאמות בזמן אמת",
      avgPrice: Math.round(avgPrice),
      avgOccupancy: Math.round(avgOccupancy * 10) / 10,
      dailyRevenue: Math.round(totalRevenue / days),
      periodRevenue: Math.round(totalRevenue),
      difference: 0,
      percentChange: 0
    }
  }

  const calculateDemandOccupancy = (predictions: Prediction[]): number => {
    const demandCounts = predictions.reduce((acc, p) => {
      const demand = p.predicted_demand || 'medium'
      acc[demand] = (acc[demand] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const high = demandCounts.high || 0
    const medium = demandCounts.medium || 0
    const low = demandCounts.low || 0
    const total = predictions.length

    return ((high * 85 + medium * 70 + low * 55) / total)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-400">
            💰 תחזית השפעה על הכנסות
          </h1>
          <p className="text-gray-300 text-lg">
            השוואה בין אסטרטגיות תמחור שונות והשפעתן על ההכנסות בפועל
          </p>
        </div>

        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Hotel Selection */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <label className="block text-white font-semibold mb-3">
              <TargetIcon className="inline-block w-5 h-5 ml-2" />
              בחר מלון
            </label>
            <select
              value={selectedHotel?.id || ''}
              onChange={(e) => {
                const hotel = hotels.find(h => h.id === e.target.value)
                setSelectedHotel(hotel || null)
              }}
              className="w-full p-3 bg-slate-800/80 text-white border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="">-- בחר מלון --</option>
              {hotels.map(hotel => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name} (₪{hotel.base_price} | {hotel.total_rooms} חדרים)
                </option>
              ))}
            </select>
          </Card>

          {/* Time Range */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
            <label className="block text-white font-semibold mb-3">
              <CalendarIcon className="inline-block w-5 h-5 ml-2" />
              טווח זמן לניתוח
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[7, 30, 90].map(days => (
                <Button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  variant={timeRange === days ? "default" : "outline"}
                  className={timeRange === days ? "bg-purple-600" : "bg-slate-700/50 border-white/20"}
                >
                  {days} ימים
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Scenarios Comparison */}
        {selectedHotel && scenarios.length > 0 ? (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="bg-gradient-to-r from-green-900/40 to-blue-900/40 backdrop-blur-lg border-white/20 p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    {selectedHotel.name}
                  </h2>
                  <p className="text-gray-300">
                    ניתוח השוואתי ל-{timeRange} ימים קדימה
                  </p>
                </div>
                <TrendingUpIcon className="w-16 h-16 text-green-400" />
              </div>

              {/* Best Scenario Highlight */}
              {scenarios.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border-2 border-green-400/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-300 mb-1">אסטרטגיה מומלצת</p>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {scenarios[scenarios.length - 1].scenario}
                      </h3>
                      <p className="text-gray-300 mb-4">
                        {scenarios[scenarios.length - 1].description}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-gray-300 mb-1">הכנסה צפויה</p>
                      <p className="text-4xl font-bold text-green-400">
                        {formatCurrency(scenarios[scenarios.length - 1].periodRevenue)}
                      </p>
                      <p className="text-sm text-gray-300 mt-1">
                        תקופת {timeRange} ימים
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Scenarios Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {scenarios.map((scenario, index) => (
                <Card
                  key={index}
                  className={`backdrop-blur-lg border-white/20 p-6 transition-all hover:scale-105 ${
                    index === scenarios.length - 1
                      ? 'bg-gradient-to-br from-purple-900/60 to-pink-900/60 border-2 border-purple-400'
                      : 'bg-white/10'
                  }`}
                >
                  {/* Scenario Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xl font-bold text-white">
                        {scenario.scenario}
                      </h3>
                      {index === scenarios.length - 1 && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-xs font-semibold">
                          מומלץ
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-300">{scenario.description}</p>
                  </div>

                  {/* Metrics Grid */}
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 flex items-center gap-1">
                        מחיר ממוצע
                        <QuickHelp term="Predicted Price" />
                      </span>
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(scenario.avgPrice)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 flex items-center gap-1">
                        תפוסה ממוצעת
                        <QuickHelp term="Occupancy Rate" />
                      </span>
                      <span className="text-xl font-bold text-white">
                        {scenario.avgOccupancy}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 flex items-center gap-1">
                        הכנסה יומית
                        <QuickHelp term="Revenue" />
                      </span>
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(scenario.dailyRevenue)}
                      </span>
                    </div>

                    <div className="h-px bg-white/20"></div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-semibold">סה"כ הכנסה</span>
                      <span className="text-2xl font-bold text-white">
                        {formatCurrency(scenario.periodRevenue)}
                      </span>
                    </div>
                  </div>

                  {/* Comparison to Current */}
                  {index > 0 && (
                    <div className={`p-4 rounded-lg ${
                      scenario.difference > 0
                        ? 'bg-green-500/20 border border-green-500/30'
                        : 'bg-red-500/20 border border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">הפרש מהנוכחי</span>
                        <div className="flex items-center gap-2">
                          {scenario.difference > 0 ? (
                            <ArrowUpIcon className="w-5 h-5 text-green-400" />
                          ) : (
                            <ArrowDownIcon className="w-5 h-5 text-red-400" />
                          )}
                          <span className={`text-xl font-bold ${
                            scenario.difference > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatCurrency(Math.abs(scenario.difference))}
                          </span>
                        </div>
                      </div>
                      <div className="text-left mt-1">
                        <span className={`text-sm font-semibold ${
                          scenario.difference > 0 ? 'text-green-300' : 'text-red-300'
                        }`}>
                          ({scenario.percentChange > 0 ? '+' : ''}{scenario.percentChange.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {/* Action Plan */}
            {scenarios.length > 0 && (
              <Card className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 backdrop-blur-lg border-white/20 p-8">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <DollarSignIcon className="w-8 h-8 text-green-400" />
                  תוכנית פעולה מומלצת
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-2">הפעל Autopilot</h4>
                      <p className="text-gray-300 text-sm">
                        עבור ל-<a href="/autopilot/tools" className="text-purple-400 hover:underline">דף הטייס האוטומטי</a> והפעל את המערכת עבור {selectedHotel.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-2">עקוב אחרי ביצועים</h4>
                      <p className="text-gray-300 text-sm">
                        המערכת תעדכן מחירים אוטומטית. עקוב אחרי<a href="/predictions" className="text-purple-400 hover:underline"> דף התחזיות</a> ו-<a href="/budget/analysis" className="text-purple-400 hover:underline">ניתוח תקציב</a>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-white mb-2">בדוק תוצאות</h4>
                      <p className="text-gray-300 text-sm">
                        לאחר 7-14 ימים, בדוק את <a href="/api/feedback/accuracy" className="text-purple-400 hover:underline">מדדי הדיוק</a> וודא שההכנסות עולות
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expected Results */}
                <div className="mt-6 p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="font-bold text-green-300 mb-3">תוצאות צפויות ב-{timeRange} ימים:</h4>
                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {formatCurrency(scenarios[scenarios.length - 1].periodRevenue - scenarios[0].periodRevenue)}
                      </p>
                      <p className="text-sm text-gray-300 mt-1">עלייה בהכנסות</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        +{scenarios[scenarios.length - 1].percentChange.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-300 mt-1">שיפור באחוזים</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">
                        {scenarios[scenarios.length - 1].avgOccupancy.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-300 mt-1">תפוסה ממוצעת</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Calculation Logs & Data Sources */}
            {selectedHotel && (
              <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <InfoIcon className="w-6 h-6 text-blue-400" />
                    מקורות נתונים וחישובים
                  </h3>
                  <Button
                    onClick={() => setShowLogs(!showLogs)}
                    variant="outline"
                    className="bg-slate-700/50 border-white/20"
                  >
                    {showLogs ? <ChevronUpIcon className="w-4 h-4 ml-2" /> : <ChevronDownIcon className="w-4 h-4 ml-2" />}
                    {showLogs ? 'הסתר לוגים' : 'הצג לוגים מפורטים'}
                  </Button>
                </div>

                {/* Data Sources Section */}
                {dataSources && (
                  <div className="space-y-4 mb-6">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-300 mb-3">📊 מקורות הנתונים</h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-300 font-medium">מידע על המלון:</p>
                            <p className="text-gray-400 text-xs mt-1">{dataSources.hotel.source}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-white">מחיר בסיס: ₪{dataSources.hotel.basePrice}</p>
                            <p className="text-white">חדרים: {dataSources.hotel.rooms}</p>
                          </div>
                        </div>

                        <div className="h-px bg-white/10"></div>

                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-300 font-medium">תחזיות AI:</p>
                            <p className="text-gray-400 text-xs mt-1">{dataSources.predictions.source}</p>
                          </div>
                          <div className="text-left">
                            <p className="text-white">{dataSources.predictions.count} תחזיות</p>
                            <p className="text-white">ממוצע: ₪{dataSources.predictions.avgPrice}</p>
                            <p className="text-white">ביטחון: {dataSources.predictions.avgConfidence}%</p>
                          </div>
                        </div>

                        <div className="h-px bg-white/10"></div>

                        <div>
                          <p className="text-gray-300 font-medium mb-2">הנחות יסוד:</p>
                          <ul className="text-gray-400 text-xs space-y-1">
                            <li>• תפוסה בסיסית: {dataSources.assumptions.baseOccupancy}</li>
                            <li>• התאמה ידנית: {dataSources.assumptions.manualAdjustment}</li>
                            <li>• אופטימיזציה Autopilot: {dataSources.assumptions.autopilotBoost}</li>
                            <li className="mt-2 italic">• מקור: {dataSources.assumptions.source}</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Formulas Section */}
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <h4 className="font-semibold text-purple-300 mb-3">🧮 נוסחאות חישוב</h4>
                      <div className="space-y-2 text-sm text-gray-300 font-mono">
                        <p>1. הכנסה יומית = מחיר × (תפוסה ÷ 100) × מספר חדרים</p>
                        <p>2. הכנסה תקופתית = הכנסה יומית × מספר ימים</p>
                        <p>3. תפוסה AI = (high×85 + medium×70 + low×55) ÷ סה"כ</p>
                        <p>4. מחיר Autopilot = מחיר AI × (1 + ביטחון×0.15)</p>
                        <p>5. תפוסה Autopilot = min(95, תפוסה בסיס × boost דינמי)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculation Logs */}
                {showLogs && calculationLogs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white mb-3">📝 יומן חישובים ({calculationLogs.length} שלבים)</h4>
                    <div className="max-h-96 overflow-y-auto space-y-2 bg-slate-900/50 rounded-lg p-4">
                      {calculationLogs.map((log, index) => (
                        <details key={index} className="bg-slate-800/50 rounded p-3 cursor-pointer hover:bg-slate-800/70 transition-colors">
                          <summary className="font-semibold text-white text-sm">
                            {log.step}
                            <span className="text-xs text-gray-400 mr-2">
                              {new Date(log.timestamp).toLocaleTimeString('he-IL')}
                            </span>
                          </summary>
                          <div className="mt-3 space-y-2 text-sm">
                            {log.formula && (
                              <div className="bg-purple-500/10 border-r-2 border-purple-500 p-2 rounded">
                                <p className="text-purple-300 font-mono text-xs">{log.formula}</p>
                              </div>
                            )}
                            <div className="bg-slate-900/50 p-2 rounded font-mono text-xs">
                              <pre className="text-gray-300 whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(log.data, null, 2)}
                              </pre>
                            </div>
                            {log.result && (
                              <div className="bg-green-500/10 border-r-2 border-green-500 p-2 rounded">
                                <p className="text-green-300 font-semibold text-xs">תוצאה:</p>
                                <pre className="text-gray-300 text-xs mt-1 whitespace-pre-wrap">
                                  {JSON.stringify(log.result, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ))}
                    </div>

                    {/* Export Logs Button */}
                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={() => {
                          const dataStr = JSON.stringify(calculationLogs, null, 2)
                          const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
                          const exportFileDefaultName = `revenue-calculation-logs-${new Date().toISOString()}.json`
                          const linkElement = document.createElement('a')
                          linkElement.setAttribute('href', dataUri)
                          linkElement.setAttribute('download', exportFileDefaultName)
                          linkElement.click()
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        💾 ייצא לוגים ל-JSON
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        ) : (
          /* Empty State */
          <Card className="bg-white/10 backdrop-blur-lg border-white/20 p-12 text-center">
            <DollarSignIcon className="w-24 h-24 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-4">
              בחר מלון כדי לראות תחזית השפעה
            </h3>
            <p className="text-gray-300 max-w-md mx-auto">
              בחר מלון מהרשימה למעלה כדי להשוות בין אסטרטגיות תמחור שונות ולראות את ההשפעה הצפויה על ההכנסות
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
