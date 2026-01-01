"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  TrendingUpIcon, 
  AlertTriangleIcon, 
  ZapIcon,
  CalendarIcon,
  DollarSignIcon,
  TargetIcon,
  Loader2Icon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon
} from "lucide-react"

interface Hotel {
  id: string
  name: string
  total_rooms: number
  base_price: number
}

interface AutopilotForecast {
  hotelId: string
  hotelName: string
  period: string
  currentRevenue: number
  forecastedRevenue: number
  revenueIncrease: number
  percentIncrease: number
  recommendedActions: Array<{
    date: string
    currentPrice: number
    recommendedPrice: number
    reasoning: string
    expectedRevenue: number
    confidence: number
  }>
  summary: {
    totalDays: number
    daysAnalyzed: number
    avgPriceIncrease: number
    highDemandDays: number
    lowDemandDays: number
    competitorComparison: string
  }
  historicalAnalysis: {
    similarPeriodLastYear: number
    yoyGrowth: number
    seasonalTrend: string
  }
  riskAssessment: {
    level: 'low' | 'medium' | 'high'
    factors: string[]
    recommendation: string
  }
}

interface PricingAlert {
  id: string
  date: string
  alertType: 'overpriced' | 'underpriced' | 'competitor_gap' | 'demand_mismatch' | 'anomaly'
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentPrice: number
  suggestedPrice: number
  priceDifference: number
  reasoning: string
  dataPoints: any
  recommendation: string
  potentialRevenueLoss: number
}

interface Props {
  hotels: Hotel[]
}

export function AutopilotTools({ hotels }: Props) {
  const [selectedHotelId, setSelectedHotelId] = useState(hotels[0]?.id || '')
  const [activeTab, setActiveTab] = useState<'forecast' | 'alerts'>('forecast')
  
  // Forecast state
  const [forecastDays, setForecastDays] = useState(30)
  const [forecast, setForecast] = useState<AutopilotForecast | null>(null)
  const [loadingForecast, setLoadingForecast] = useState(false)
  
  // Alerts state
  const [alertDays, setAlertDays] = useState(30)
  const [minSeverity, setMinSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [alerts, setAlerts] = useState<PricingAlert[]>([])
  const [alertsSummary, setAlertsSummary] = useState<any>(null)
  const [loadingAlerts, setLoadingAlerts] = useState(false)

  const selectedHotel = hotels.find(h => h.id === selectedHotelId)

  const fetchForecast = async () => {
    if (!selectedHotelId) return
    
    setLoadingForecast(true)
    try {
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const response = await fetch(
        `/api/autopilot/forecast?hotelId=${selectedHotelId}&startDate=${startDate}&endDate=${endDate}`
      )
      const data = await response.json()
      setForecast(data)
    } catch (error) {
      console.error('Error fetching forecast:', error)
    } finally {
      setLoadingForecast(false)
    }
  }

  const fetchAlerts = async () => {
    if (!selectedHotelId) return
    
    setLoadingAlerts(true)
    try {
      const startDate = new Date().toISOString().split('T')[0]
      const endDate = new Date(Date.now() + alertDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const response = await fetch(
        `/api/pricing/alerts?hotelId=${selectedHotelId}&startDate=${startDate}&endDate=${endDate}&minSeverity=${minSeverity}`
      )
      const data = await response.json()
      setAlerts(data.alerts || [])
      setAlertsSummary(data.summary || null)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoadingAlerts(false)
    }
  }

  const severityConfig = {
    critical: { color: 'bg-red-500', text: 'text-red-400', label: 'קריטי', icon: XCircleIcon },
    high: { color: 'bg-orange-500', text: 'text-orange-400', label: 'גבוה', icon: AlertTriangleIcon },
    medium: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'בינוני', icon: InfoIcon },
    low: { color: 'bg-blue-500', text: 'text-blue-400', label: 'נמוך', icon: CheckCircleIcon }
  }

  const alertTypeLabels = {
    overpriced: 'מחיר גבוה מדי',
    underpriced: 'מחיר נמוך מדי',
    competitor_gap: 'פער מתחרים',
    demand_mismatch: 'אי-התאמה לביקוש',
    anomaly: 'אנומליה'
  }

  const riskColors = {
    low: 'bg-green-500/20 border-green-500/30 text-green-400',
    medium: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    high: 'bg-red-500/20 border-red-500/30 text-red-400'
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <ZapIcon className="h-10 w-10 text-purple-400" />
            Autopilot Intelligence
          </h1>
          <p className="text-slate-400 mt-2">חיזוי הכנסות ואזהרות תמחור מתקדמות</p>
        </div>
        <Badge variant="outline" className="text-sm px-4 py-2">
          AI-Powered
        </Badge>
      </div>

      {/* Hotel Selector */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">בחר מלון</label>
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedHotel && (
              <div className="flex gap-6 text-sm text-slate-400">
                <div>
                  <span className="block text-xs mb-1">חדרים</span>
                  <span className="font-bold text-white">{selectedHotel.total_rooms}</span>
                </div>
                <div>
                  <span className="block text-xs mb-1">מחיר בסיס</span>
                  <span className="font-bold text-white">₪{selectedHotel.base_price}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          onClick={() => setActiveTab('forecast')}
          variant={activeTab === 'forecast' ? 'default' : 'outline'}
          className="flex-1"
        >
          <TrendingUpIcon className="h-4 w-4 mr-2" />
          חיזוי הכנסות Autopilot
        </Button>
        <Button
          onClick={() => setActiveTab('alerts')}
          variant={activeTab === 'alerts' ? 'default' : 'outline'}
          className="flex-1"
        >
          <AlertTriangleIcon className="h-4 w-4 mr-2" />
          התראות תמחור
        </Button>
      </div>

      {/* Forecast Tab */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Controls */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">תקופת חיזוי</label>
                  <Select value={forecastDays.toString()} onValueChange={(v) => setForecastDays(parseInt(v))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 ימים</SelectItem>
                      <SelectItem value="14">14 ימים</SelectItem>
                      <SelectItem value="30">30 ימים</SelectItem>
                      <SelectItem value="60">60 ימים</SelectItem>
                      <SelectItem value="90">90 ימים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={fetchForecast} 
                  disabled={loadingForecast}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {loadingForecast ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      מחשב...
                    </>
                  ) : (
                    <>
                      <ZapIcon className="h-4 w-4 mr-2" />
                      חשב חיזוי
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Forecast Results */}
          {forecast && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-500/20 rounded-xl">
                        <DollarSignIcon className="h-6 w-6 text-blue-400" />
                      </div>
                      <Badge variant="outline" className="text-xs">נוכחי</Badge>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      ₪{forecast.currentRevenue.toLocaleString()}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">הכנסות נוכחיות</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-purple-500/20 rounded-xl">
                        <TargetIcon className="h-6 w-6 text-purple-400" />
                      </div>
                      <Badge variant="outline" className="text-xs">חיזוי</Badge>
                    </div>
                    <div className="text-3xl font-bold text-white">
                      ₪{forecast.forecastedRevenue.toLocaleString()}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">עם Autopilot</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-green-500/20 rounded-xl">
                        <TrendingUpIcon className="h-6 w-6 text-green-400" />
                      </div>
                      <Badge variant="outline" className="text-xs">עלייה</Badge>
                    </div>
                    <div className="text-3xl font-bold text-green-400">
                      +₪{forecast.revenueIncrease.toLocaleString()}
                    </div>
                    <p className="text-sm text-slate-400 mt-1">
                      +{forecast.percentIncrease}%
                    </p>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br border ${riskColors[forecast.riskAssessment.level]}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-white/10 rounded-xl">
                        <InfoIcon className="h-6 w-6" />
                      </div>
                      <Badge variant="outline" className="text-xs">סיכון</Badge>
                    </div>
                    <div className="text-2xl font-bold">
                      {forecast.riskAssessment.level === 'low' && 'נמוך'}
                      {forecast.riskAssessment.level === 'medium' && 'בינוני'}
                      {forecast.riskAssessment.level === 'high' && 'גבוה'}
                    </div>
                    <p className="text-sm opacity-80 mt-1">
                      {forecast.summary.daysAnalyzed} ימים
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Analysis Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Historical Analysis */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">ניתוח היסטורי</CardTitle>
                    <CardDescription>השוואה לתקופה מקבילה אשתקד</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400">אשתקד</span>
                      <span className="font-bold text-white">
                        ₪{forecast.historicalAnalysis.similarPeriodLastYear.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400">צמיחה YoY</span>
                      <span className={`font-bold ${forecast.historicalAnalysis.yoyGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {forecast.historicalAnalysis.yoyGrowth > 0 ? '+' : ''}{forecast.historicalAnalysis.yoyGrowth}%
                      </span>
                    </div>
                    <div className="flex justify-between p-3 bg-slate-800/50 rounded-lg">
                      <span className="text-slate-400">מגמה עונתית</span>
                      <Badge variant="outline">
                        {forecast.historicalAnalysis.seasonalTrend.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Assessment */}
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-white">הערכת סיכונים</CardTitle>
                    <CardDescription>{forecast.riskAssessment.recommendation}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {forecast.riskAssessment.factors.map((factor, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-slate-800/30 rounded-lg">
                        <AlertTriangleIcon className="h-4 w-4 text-yellow-400" />
                        <span className="text-sm text-slate-300">{factor}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Recommended Actions Table */}
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader>
                  <CardTitle className="text-white">המלצות Autopilot ({forecast.recommendedActions.length} ימים)</CardTitle>
                  <CardDescription>
                    שינויי מחיר מומלצים לפי Multi-Agent Analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {forecast.recommendedActions.slice(0, 20).map((action, i) => {
                      const priceChange = action.recommendedPrice - action.currentPrice
                      const isIncrease = priceChange > 0
                      
                      return (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <CalendarIcon className="h-4 w-4 text-slate-400" />
                              <span className="font-medium text-white">
                                {new Date(action.date).toLocaleDateString('he-IL', { 
                                  weekday: 'short', 
                                  day: 'numeric', 
                                  month: 'short' 
                                })}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {action.confidence}% confidence
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-400">{action.reasoning}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm text-slate-400">נוכחי</div>
                              <div className="font-bold text-white">₪{action.currentPrice}</div>
                            </div>
                            <div className="text-2xl text-slate-600">→</div>
                            <div className="text-right">
                              <div className="text-sm text-slate-400">מומלץ</div>
                              <div className={`font-bold ${isIncrease ? 'text-green-400' : 'text-orange-400'}`}>
                                ₪{action.recommendedPrice}
                                <span className="text-xs ml-1">
                                  ({isIncrease ? '+' : ''}{priceChange})
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {forecast.recommendedActions.length > 20 && (
                    <p className="text-center text-sm text-slate-500 mt-4">
                      מוצגים 20 מתוך {forecast.recommendedActions.length} ימים
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Controls */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="pt-6">
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">תקופת בדיקה</label>
                  <Select value={alertDays.toString()} onValueChange={(v) => setAlertDays(parseInt(v))}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 ימים</SelectItem>
                      <SelectItem value="14">14 ימים</SelectItem>
                      <SelectItem value="30">30 ימים</SelectItem>
                      <SelectItem value="60">60 ימים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-2">חומרה מינימלית</label>
                  <Select value={minSeverity} onValueChange={(v: any) => setMinSeverity(v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">נמוך ומעלה</SelectItem>
                      <SelectItem value="medium">בינוני ומעלה</SelectItem>
                      <SelectItem value="high">גבוה ומעלה</SelectItem>
                      <SelectItem value="critical">קריטי בלבד</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={fetchAlerts} 
                  disabled={loadingAlerts}
                  className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                >
                  {loadingAlerts ? (
                    <>
                      <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                      סורק...
                    </>
                  ) : (
                    <>
                      <AlertTriangleIcon className="h-4 w-4 mr-2" />
                      סרוק התראות
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Summary */}
          {alertsSummary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-white">{alertsSummary.total}</div>
                  <div className="text-xs text-slate-400 mt-1">סה"כ התראות</div>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{alertsSummary.critical}</div>
                  <div className="text-xs text-red-300 mt-1">קריטי</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-500/10 border-orange-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-400">{alertsSummary.high}</div>
                  <div className="text-xs text-orange-300 mt-1">גבוה</div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/10 border-yellow-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{alertsSummary.medium}</div>
                  <div className="text-xs text-yellow-300 mt-1">בינוני</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{alertsSummary.low}</div>
                  <div className="text-xs text-blue-300 mt-1">נמוך</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Alerts List */}
          {alerts.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white">התראות תמחור ({alerts.length})</CardTitle>
                <CardDescription>תאריכים עם תמחור בעייתי שדורשים תשומת לב</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {alerts.map((alert) => {
                    const config = severityConfig[alert.severity]
                    const Icon = config.icon
                    
                    return (
                      <div 
                        key={alert.id}
                        className={`p-4 rounded-lg border-2 ${config.color} bg-slate-800/30`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${config.text}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">
                                  {new Date(alert.date).toLocaleDateString('he-IL', { 
                                    weekday: 'long', 
                                    day: 'numeric', 
                                    month: 'long' 
                                  })}
                                </span>
                                <Badge className={config.color}>{config.label}</Badge>
                                <Badge variant="outline" className="text-xs">
                                  {alertTypeLabels[alert.alertType]}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-400 mt-1">{alert.reasoning}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="p-3 bg-slate-800/50 rounded">
                            <div className="text-xs text-slate-400 mb-1">מחיר נוכחי</div>
                            <div className="text-lg font-bold text-white">₪{alert.currentPrice}</div>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded">
                            <div className="text-xs text-slate-400 mb-1">מחיר מוצע</div>
                            <div className="text-lg font-bold text-cyan-400">₪{alert.suggestedPrice}</div>
                          </div>
                          <div className="p-3 bg-slate-800/50 rounded">
                            <div className="text-xs text-slate-400 mb-1">הפסד פוטנציאלי</div>
                            <div className="text-lg font-bold text-red-400">₪{alert.potentialRevenueLoss.toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
                          <div className="text-xs text-cyan-300 mb-1">💡 המלצה</div>
                          <p className="text-sm text-cyan-100">{alert.recommendation}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {alerts.length === 0 && !loadingAlerts && alertsSummary && (
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="py-12 text-center">
                <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-400 mb-2">מצוין! אין התראות</h3>
                <p className="text-green-300">המחירים שלך נראים טוב בתקופה הנבחרת</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
