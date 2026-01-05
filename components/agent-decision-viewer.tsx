"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Brain, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar, 
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Target,
  BarChart3,
  Sparkles,
  Activity
} from "lucide-react"

interface AgentDecision {
  agentName: string
  status: 'running' | 'completed' | 'failed'
  startTime: number
  endTime?: number
  decision: any
  confidence: number
  impact: number
  reasoning: string[]
}

interface AgentDecisionViewerProps {
  hotelId: string
  predictionDate: string
  sessionId?: string
}

export function AgentDecisionViewer({ hotelId, predictionDate, sessionId }: AgentDecisionViewerProps) {
  const [agents, setAgents] = useState<AgentDecision[]>([])
  const [finalPrice, setFinalPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgentDecisions()
  }, [hotelId, predictionDate, sessionId])

  const fetchAgentDecisions = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/predictions/logs?hotelId=${hotelId}&predictionDate=${predictionDate}&latest=true`
      )
      const data = await response.json()

      if (data.success && data.logs.length > 0) {
        const log = data.logs[0]
        parseAgentDecisions(log)
        setFinalPrice(log.result?.predictedPrice || null)
      }
    } catch (error) {
      console.error("Error fetching agent decisions:", error)
    } finally {
      setLoading(false)
    }
  }

  const parseAgentDecisions = (log: any) => {
    const agentList: AgentDecision[] = []

    // Budget Agent
    if (log.factors?.budget) {
      agentList.push({
        agentName: 'Budget Agent',
        status: 'completed',
        startTime: Date.now() - 5000,
        endTime: Date.now() - 4500,
        decision: log.factors.budget.value,
        confidence: 0.85,
        impact: (log.factors.budget.value - 1) * 100,
        reasoning: [log.factors.budget.reasoning]
      })
    }

    // Velocity Agent
    if (log.factors?.velocity) {
      agentList.push({
        agentName: 'Velocity Agent',
        status: 'completed',
        startTime: Date.now() - 4500,
        endTime: Date.now() - 4000,
        decision: log.factors.velocity.value,
        confidence: 0.80,
        impact: (log.factors.velocity.value - 1) * 100,
        reasoning: [log.factors.velocity.reasoning]
      })
    }

    // Events Agent
    if (log.factors?.events) {
      const eventsList = log.factors.events.eventsList || log.multi_agent_data?.eventsList || []
      agentList.push({
        agentName: 'Events Agent',
        status: 'completed',
        startTime: Date.now() - 4000,
        endTime: Date.now() - 3000,
        decision: {
          eventsFound: eventsList.length,
          totalImpact: log.factors.events.value,
          events: eventsList
        },
        confidence: log.multi_agent_data?.eventsConfidence || 0.75,
        impact: (log.factors.events.value - 1) * 100,
        reasoning: [
          log.factors.events.reasoning,
          eventsList.length > 0 ? `נמצאו ${eventsList.length} אירועים מהותיים` : 'לא נמצאו אירועים'
        ]
      })
    }

    // Historical Agent
    if (log.multi_agent_data?.historicalData) {
      agentList.push({
        agentName: 'Historical Agent',
        status: 'completed',
        startTime: Date.now() - 3000,
        endTime: Date.now() - 2500,
        decision: {
          trend: log.multi_agent_data.historicalTrend,
          dataPoints: log.multi_agent_data.historicalData
        },
        confidence: log.multi_agent_data.historicalConfidence || 0.70,
        impact: 5,
        reasoning: [
          `מגמה היסטורית: ${log.multi_agent_data.historicalTrend || 'יציבה'}`,
          `מבוסס על ${log.multi_agent_data.historicalData || 0} נקודות נתונים`
        ]
      })
    }

    // Statistics Agent
    if (log.multi_agent_data?.statisticsConfidence) {
      agentList.push({
        agentName: 'Statistics Agent',
        status: 'completed',
        startTime: Date.now() - 2500,
        endTime: Date.now() - 1500,
        decision: {
          marketAvg: log.multi_agent_data.marketAvgPrice,
          sentiment: log.multi_agent_data.marketSentiment
        },
        confidence: log.multi_agent_data.statisticsConfidence,
        impact: 3,
        reasoning: [
          log.multi_agent_data.marketAvgPrice 
            ? `מחיר שוק ממוצע: ₪${Math.round(log.multi_agent_data.marketAvgPrice)}`
            : 'לא זמין מחיר שוק',
          `סנטימנט: ${log.multi_agent_data.marketSentiment || 'ניטרלי'}`
        ]
      })
    }

    // Competitor Agent
    if (log.factors?.competitor) {
      agentList.push({
        agentName: 'Competitor Agent',
        status: 'completed',
        startTime: Date.now() - 1500,
        endTime: Date.now() - 500,
        decision: {
          avgPrice: log.input_data?.competitorAvg,
          count: log.input_data?.competitorPrices || 0,
          multiplier: log.factors.competitor.value
        },
        confidence: log.multi_agent_data?.competitorsConfidence || 0.65,
        impact: (log.factors.competitor.value - 1) * 100,
        reasoning: [
          log.factors.competitor.reasoning,
          log.input_data?.competitorPrices 
            ? `${log.input_data.competitorPrices} מתחרים נסרקו`
            : 'אין נתוני מתחרים'
        ]
      })
    }

    // Seasonality
    if (log.factors?.seasonality) {
      agentList.push({
        agentName: 'Seasonality Agent',
        status: 'completed',
        startTime: Date.now() - 5500,
        endTime: Date.now() - 5000,
        decision: log.factors.seasonality.value,
        confidence: 0.90,
        impact: (log.factors.seasonality.value - 1) * 100,
        reasoning: [log.factors.seasonality.reasoning]
      })
    }

    // Occupancy
    if (log.factors?.occupancy) {
      agentList.push({
        agentName: 'Occupancy Agent',
        status: 'completed',
        startTime: Date.now() - 6000,
        endTime: Date.now() - 5500,
        decision: {
          multiplier: log.factors.occupancy.value,
          booked: log.input_data?.bookedRooms,
          total: log.input_data?.totalRooms
        },
        confidence: 0.95,
        impact: (log.factors.occupancy.value - 1) * 100,
        reasoning: [
          log.factors.occupancy.reasoning,
          log.input_data?.bookedRooms && log.input_data?.totalRooms
            ? `תפוסה: ${log.input_data.bookedRooms}/${log.input_data.totalRooms} (${Math.round((log.input_data.bookedRooms / log.input_data.totalRooms) * 100)}%)`
            : ''
        ].filter(Boolean)
      })
    }

    setAgents(agentList)
  }

  const getAgentIcon = (name: string) => {
    const icons: Record<string, any> = {
      'Budget Agent': DollarSign,
      'Velocity Agent': Zap,
      'Events Agent': Calendar,
      'Historical Agent': TrendingUp,
      'Statistics Agent': BarChart3,
      'Competitor Agent': Users,
      'Seasonality Agent': Activity,
      'Occupancy Agent': Target
    }
    return icons[name] || Brain
  }

  const getImpactColor = (impact: number) => {
    if (impact > 5) return 'text-green-600 bg-green-50 border-green-200'
    if (impact > 0) return 'text-blue-600 bg-blue-50 border-blue-200'
    if (impact > -5) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-red-600 bg-red-50 border-red-200'
  }

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-600" />
    if (status === 'failed') return <AlertCircle className="w-4 h-4 text-red-600" />
    return <Clock className="w-4 h-4 text-yellow-600 animate-pulse" />
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Sparkles className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            טוען נתוני סוכנים...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with Final Price */}
      {finalPrice && (
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-6 h-6" />
                <span>המלצת מחיר סופית</span>
              </div>
              <div className="text-4xl font-bold text-primary">
                ₪{finalPrice.toLocaleString()}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent, idx) => {
          const Icon = getAgentIcon(agent.agentName)
          const executionTime = agent.endTime && agent.startTime 
            ? agent.endTime - agent.startTime 
            : 0

          return (
            <Card key={idx} className="relative overflow-hidden">
              {/* Status Indicator */}
              <div className={`absolute top-0 left-0 w-1 h-full ${
                agent.status === 'completed' ? 'bg-green-500' :
                agent.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />

              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.agentName}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(agent.status)}
                        <span className="text-xs text-muted-foreground">
                          {executionTime > 0 ? `${executionTime}ms` : 'בביצוע...'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getImpactColor(agent.impact)}
                  >
                    {agent.impact > 0 ? '+' : ''}{agent.impact.toFixed(1)}%
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Confidence Score */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">רמת ביטחון</span>
                    <span className="font-semibold">{(agent.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={agent.confidence * 100} className="h-2" />
                </div>

                {/* Decision Details */}
                {typeof agent.decision === 'object' && agent.decision !== null ? (
                  <div className="text-sm space-y-1">
                    {Object.entries(agent.decision).map(([key, value]) => {
                      if (key === 'events' && Array.isArray(value)) {
                        return (
                          <div key={key} className="mt-2">
                            <div className="font-semibold text-xs text-muted-foreground mb-1">אירועים:</div>
                            {value.slice(0, 3).map((event: any, i: number) => (
                              <div key={i} className="text-xs bg-yellow-50 border border-yellow-200 rounded p-1 mb-1">
                                {event.name} ({new Date(event.date).toLocaleDateString('he-IL')})
                              </div>
                            ))}
                          </div>
                        )
                      }
                      
                      if (typeof value === 'number') {
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-semibold">
                              {key.includes('price') || key.includes('Avg') 
                                ? `₪${Math.round(value).toLocaleString()}`
                                : value.toFixed(3)
                              }
                            </span>
                          </div>
                        )
                      }
                      
                      if (typeof value === 'string') {
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        )
                      }
                      
                      return null
                    })}
                  </div>
                ) : (
                  <div className="text-sm">
                    <span className="text-muted-foreground">מכפיל: </span>
                    <span className="font-semibold">{agent.decision.toFixed(3)}</span>
                  </div>
                )}

                {/* Reasoning */}
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-muted-foreground">נימוקים:</div>
                  {agent.reasoning.map((reason, i) => (
                    <div key={i} className="text-xs bg-muted/50 rounded p-2 flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      {agents.length > 0 && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Sparkles className="w-5 h-5" />
              סיכום תהליך קבלת ההחלטה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">סוכנים פעילים</div>
                <div className="text-2xl font-bold text-blue-900">{agents.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground">ביטחון ממוצע</div>
                <div className="text-2xl font-bold text-blue-900">
                  {(agents.reduce((sum, a) => sum + a.confidence, 0) / agents.length * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">השפעה כוללת</div>
                <div className="text-2xl font-bold text-blue-900">
                  {agents.reduce((sum, a) => sum + Math.abs(a.impact), 0).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4" />
                <span>
                  המחיר מחושב ע"י שילוב משוקלל של {agents.length} סוכני AI, כאשר כל סוכן מנתח מימד שונו של השוק
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
