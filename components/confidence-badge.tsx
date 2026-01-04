"use client"

import { HelpCircle, CheckCircle, AlertTriangle, XCircle, TrendingUp } from "lucide-react"
import type { ConfidenceResult } from "@/lib/calculations/revenue-calculator"

interface ConfidenceBadgeProps {
  confidence: number | ConfidenceResult
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ConfidenceBadge({ confidence, showDetails = true, size = 'md' }: ConfidenceBadgeProps) {
  // Handle both number and full ConfidenceResult
  const confidenceScore = typeof confidence === 'number' ? confidence : confidence.score
  const confidenceData = typeof confidence === 'number' ? null : confidence
  
  // Determine level from score
  const level = confidenceScore >= 80 ? 'very_high' 
    : confidenceScore >= 65 ? 'high'
    : confidenceScore >= 45 ? 'medium'
    : 'low'
  
  // Styling based on level
  const config = {
    very_high: {
      color: 'bg-green-500/20 border-green-500/30 text-green-400',
      icon: CheckCircle,
      label: 'גבוה מאוד',
      description: 'רמת ביטחון מצוינת - המלצה חזקה'
    },
    high: {
      color: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
      icon: TrendingUp,
      label: 'גבוה',
      description: 'רמת ביטחון טובה - המלצה סבירה'
    },
    medium: {
      color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
      icon: AlertTriangle,
      label: 'בינוני',
      description: 'רמת ביטחון סבירה - שקול בזהירות'
    },
    low: {
      color: 'bg-red-500/20 border-red-500/30 text-red-400',
      icon: XCircle,
      label: 'נמוך',
      description: 'רמת ביטחון נמוכה - דרוש מידע נוסף'
    }
  }
  
  const { color, icon: Icon, label, description } = config[level]
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }
  
  if (!showDetails) {
    // Simple badge without tooltip
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border ${color} ${sizeClasses[size]}`}>
        <Icon className="w-3 h-3" />
        <span className="font-semibold">{confidenceScore}%</span>
      </span>
    )
  }
  
  // Badge with detailed tooltip
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button className={`inline-flex items-center gap-1.5 rounded-full border ${color} ${sizeClasses[size]} hover:opacity-80 transition-opacity cursor-help`}>
            <Icon className="w-3 h-3" />
            <span className="font-semibold">{confidenceScore}%</span>
            <HelpCircle className="w-3 h-3 opacity-60" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm p-4 bg-gray-900 border-gray-700" dir="rtl">
          <div className="space-y-3">
            {/* Header */}
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <Icon className="w-4 h-4" />
                רמת ביטחון: {label} ({confidenceScore}%)
              </div>
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            </div>
            
            {/* Factors breakdown */}
            {confidenceData?.factors && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-300 border-b border-gray-700 pb-1">
                  גורמים משפיעים:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {confidenceData.factors.dataQuality > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">איכות נתונים:</span>
                      <span className="text-white font-mono">{confidenceData.factors.dataQuality}/25</span>
                    </div>
                  )}
                  {confidenceData.factors.scanRecency > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">עדכניות סריקות:</span>
                      <span className="text-white font-mono">{confidenceData.factors.scanRecency}/20</span>
                    </div>
                  )}
                  {confidenceData.factors.historicalData > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">נתונים היסטוריים:</span>
                      <span className="text-white font-mono">{confidenceData.factors.historicalData}/20</span>
                    </div>
                  )}
                  {confidenceData.factors.competitorData > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">מחירי מתחרים:</span>
                      <span className="text-white font-mono">{confidenceData.factors.competitorData}/15</span>
                    </div>
                  )}
                  {confidenceData.factors.bookingData > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">הזמנות קיימות:</span>
                      <span className="text-white font-mono">{confidenceData.factors.bookingData}/10</span>
                    </div>
                  )}
                  {confidenceData.factors.marketConsistency > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">עקביות שוק:</span>
                      <span className="text-white font-mono">{confidenceData.factors.marketConsistency}/10</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Explanation */}
            {confidenceData?.explanation && (
              <div className="text-xs text-gray-300 bg-gray-800/50 rounded p-2">
                💡 {confidenceData.explanation}
              </div>
            )}
            
            {/* Improvements */}
            {confidenceData?.improvements && confidenceData.improvements.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-300">
                  💪 דרכים לשיפור:
                </div>
                <ul className="text-xs text-gray-400 space-y-0.5">
                  {confidenceData.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-blue-400">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Score scale reference */}
            <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
              <div className="font-semibold mb-1">סולם ציונים:</div>
              <div className="space-y-0.5 font-mono">
                <div>80-100: גבוה מאוד ✓</div>
                <div>65-79: גבוה</div>
                <div>45-64: בינוני</div>
                <div>0-44: נמוך</div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Compact version for table cells
 */
export function ConfidenceCell({ confidence }: { confidence: number | ConfidenceResult }) {
  return (
    <div className="flex items-center justify-center">
      <ConfidenceBadge confidence={confidence} size="sm" />
    </div>
  )
}
