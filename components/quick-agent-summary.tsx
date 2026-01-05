"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { 
  Brain, 
  Info,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react"

interface AgentSummary {
  name: string
  impact: number
  confidence: number
  status: 'positive' | 'negative' | 'neutral'
  reason: string
}

interface QuickAgentSummaryProps {
  hotelId: string
  predictionDate: string
  predictedPrice: number
  basePrice: number
}

export function QuickAgentSummary({ 
  hotelId, 
  predictionDate, 
  predictedPrice, 
  basePrice 
}: QuickAgentSummaryProps) {
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const priceChange = ((predictedPrice - basePrice) / basePrice) * 100

  const loadAgents = async () => {
    if (loaded) return // Already loaded
    
    setLoading(true)
    try {
      const response = await fetch(
        `/api/predictions/logs?hotelId=${hotelId}&predictionDate=${predictionDate}&latest=true`
      )
      const data = await response.json()

      if (data.success && data.logs.length > 0) {
        const log = data.logs[0]
        const agentList: AgentSummary[] = []

        // Parse agents from log
        if (log.factors?.seasonality) {
          const impact = (log.factors.seasonality.value - 1) * 100
          agentList.push({
            name: 'עונתיות',
            impact,
            confidence: 90,
            status: impact > 2 ? 'positive' : impact < -2 ? 'negative' : 'neutral',
            reason: log.factors.seasonality.reasoning
          })
        }

        if (log.factors?.events) {
          const impact = (log.factors.events.value - 1) * 100
          agentList.push({
            name: 'אירועים',
            impact,
            confidence: (log.multi_agent_data?.eventsConfidence || 0.75) * 100,
            status: impact > 2 ? 'positive' : impact < -2 ? 'negative' : 'neutral',
            reason: log.factors.events.reasoning
          })
        }

        if (log.factors?.competitor) {
          const impact = (log.factors.competitor.value - 1) * 100
          agentList.push({
            name: 'מתחרים',
            impact,
            confidence: (log.multi_agent_data?.competitorsConfidence || 0.65) * 100,
            status: impact > 2 ? 'positive' : impact < -2 ? 'negative' : 'neutral',
            reason: log.factors.competitor.reasoning
          })
        }

        if (log.factors?.occupancy) {
          const impact = (log.factors.occupancy.value - 1) * 100
          agentList.push({
            name: 'תפוסה',
            impact,
            confidence: 95,
            status: impact > 2 ? 'positive' : impact < -2 ? 'negative' : 'neutral',
            reason: log.factors.occupancy.reasoning
          })
        }

        if (log.multi_agent_data?.historicalData) {
          agentList.push({
            name: 'היסטורי',
            impact: 3,
            confidence: (log.multi_agent_data.historicalConfidence || 0.7) * 100,
            status: 'neutral',
            reason: `מגמה: ${log.multi_agent_data.historicalTrend || 'יציבה'}`
          })
        }

        setAgents(agentList)
        setLoaded(true)
      }
    } catch (error) {
      console.error("Error loading agents:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    if (status === 'positive') return <TrendingUp className="w-3 h-3 text-green-600" />
    if (status === 'negative') return <TrendingDown className="w-3 h-3 text-red-600" />
    return <Minus className="w-3 h-3 text-gray-600" />
  }

  const getStatusColor = (status: string) => {
    if (status === 'positive') return 'text-green-600 bg-green-50 border-green-200'
    if (status === 'negative') return 'text-red-600 bg-red-50 border-red-200'
    return 'text-gray-600 bg-gray-50 border-gray-200'
  }

  return (
    <Popover onOpenChange={(open) => { if (open) loadAgents() }}>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200">
          <Brain className="w-3 h-3" />
          <span>AI Agents</span>
          <Info className="w-3 h-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start" dir="rtl">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="font-semibold">סוכני AI</span>
            </div>
            <Badge 
              variant="outline" 
              className={priceChange > 0 ? 'text-green-600' : priceChange < 0 ? 'text-red-600' : 'text-gray-600'}
            >
              {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
            </Badge>
          </div>

          {loading && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              טוען...
            </div>
          )}

          {!loading && agents.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              אין נתוני סוכנים זמינים
            </div>
          )}

          {!loading && agents.length > 0 && (
            <div className="space-y-2">
              {agents.map((agent, idx) => (
                <Card key={idx} className="shadow-none border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(agent.status)}
                        <span className="font-semibold text-sm">{agent.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getStatusColor(agent.status)}`}
                        >
                          {agent.impact > 0 ? '+' : ''}{agent.impact.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {agent.reason}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ביטחון: {agent.confidence.toFixed(0)}%</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                המחיר הסופי מחושב על ידי שילוב משוקלל של כל הסוכנים
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
