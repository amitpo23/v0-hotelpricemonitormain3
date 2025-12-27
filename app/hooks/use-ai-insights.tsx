/**
 * AI Insights Hook
 * React hook for using the AI Research Agent
 */

import { useState } from 'react'

interface AIInsights {
  insights: string
  recommendation: 'increase' | 'decrease' | 'maintain'
  confidence: number
  reasoning: string
}

interface MarketIntelligence {
  events: Array<{
    name: string
    date: string
    impact: 'high' | 'medium' | 'low'
    description: string
  }>
  news: Array<{
    title: string
    summary: string
    sentiment: 'positive' | 'neutral' | 'negative'
  }>
  marketTrends: {
    summary: string
    factors: string[]
  }
}

interface AIInsightsResponse {
  success: boolean
  aiAnalysis: AIInsights
  marketIntelligence: MarketIntelligence
  historicalContext: {
    avgPrice: number
    priceRange: { min: number; max: number }
  }
  competitorContext: {
    avgPrice: number
    competitors: Array<{ name: string; price: number }>
  }
  occupancyContext?: {
    current: number
    level: 'high' | 'medium' | 'low'
  }
}

export function useAIInsights() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AIInsightsResponse | null>(null)

  const getInsights = async (
    hotelId: number,
    hotelName: string,
    targetDate: string,
    location: string = 'Tel Aviv'
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/predictions/ai-insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hotelId,
          hotelName,
          targetDate,
          location,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result: AIInsightsResponse = await response.json()
      setData(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const quickSearch = async (query: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/predictions/ai-insights/search?query=${encodeURIComponent(query)}`
      )

      if (!response.ok) {
        throw new Error(`Search error: ${response.status}`)
      }

      const result = await response.json()
      return result.result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    data,
    getInsights,
    quickSearch,
  }
}

// Example usage in a component:
/*
import { useAIInsights } from '@/hooks/use-ai-insights'

export function PricingRecommendation({ hotelId, hotelName, targetDate }) {
  const { loading, error, data, getInsights } = useAIInsights()

  useEffect(() => {
    getInsights(hotelId, hotelName, targetDate)
  }, [hotelId, targetDate])

  if (loading) return <div>Loading AI insights...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-bold">AI Recommendation</h3>
        <p className="text-2xl">{data.aiAnalysis.recommendation.toUpperCase()}</p>
        <p className="text-sm">Confidence: {data.aiAnalysis.confidence}%</p>
      </div>

      <div className="bg-white p-4 rounded-lg">
        <h4 className="font-semibold">Insights</h4>
        <p>{data.aiAnalysis.insights}</p>
      </div>

      <div className="bg-white p-4 rounded-lg">
        <h4 className="font-semibold">Reasoning</h4>
        <p>{data.aiAnalysis.reasoning}</p>
      </div>

      {data.marketIntelligence.events.length > 0 && (
        <div className="bg-white p-4 rounded-lg">
          <h4 className="font-semibold">Upcoming Events</h4>
          {data.marketIntelligence.events.map((event, i) => (
            <div key={i} className="mt-2">
              <p className="font-medium">{event.name}</p>
              <p className="text-sm text-gray-600">
                Impact: {event.impact} • {event.date}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
*/
