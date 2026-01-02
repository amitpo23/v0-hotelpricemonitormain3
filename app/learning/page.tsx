/**
 * Learning Dashboard - Visualize Prediction Accuracy & Model Performance
 * 
 * Shows:
 * - Accuracy trends over time
 * - Error distribution
 * - Best/worst predictions
 * - Learning recommendations
 * - Model performance metrics
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

interface AccuracyData {
  prediction_date: string
  predicted_price: number
  actual_price: number
  price_error_percent: number
  accuracy_score: number
  prediction_confidence: number
  hotel_id: string
}

interface LearningInsights {
  totalPredictions: number
  avgAccuracy: string
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  recommendations: string[]
  accuracyData: AccuracyData[]
  performanceSummaries: any[]
}

export default function LearningDashboard() {
  const [insights, setInsights] = useState<LearningInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [days, setDays] = useState(30)
  const [lastRefresh, setLastRefresh] = useState<any>(null)

  useEffect(() => {
    loadInsights()
    loadRefreshStatus()
  }, [days])

  const loadInsights = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/learning/accuracy?days=${days}`)
      const data = await response.json()
      if (data.success) {
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Failed to load insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRefreshStatus = async () => {
    try {
      const response = await fetch('/api/learning/refresh-predictions')
      const data = await response.json()
      if (data.success && data.lastRefresh) {
        setLastRefresh(data.lastRefresh)
      }
    } catch (error) {
      console.error('Failed to load refresh status:', error)
    }
  }

  const checkAccuracyNow = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/learning/accuracy?daysBack=7', {
        method: 'POST'
      })
      const data = await response.json()
      alert(`בדיקה הושלמה!\n${data.predictionsChecked} חיזויים נבדקו\n${data.accuracyUpdated} עודכנו\nדיוק ממוצע: ${data.avgAccuracy.toFixed(1)}%`)
      loadInsights()
    } catch (error) {
      alert('שגיאה בבדיקת דיוק')
    } finally {
      setRefreshing(false)
    }
  }

  const refreshPredictionsNow = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/learning/refresh-predictions', {
        method: 'POST'
      })
      const data = await response.json()
      alert(`רענון הושלם!\n${data.hotelsProcessed} מלונות\n${data.predictionsGenerated} חיזויים חדשים`)
      loadRefreshStatus()
    } catch (error) {
      alert('שגיאה ברענון חיזויים')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>טוען נתוני למידה...</p>
        </div>
      </div>
    )
  }

  const getTrendIcon = () => {
    if (!insights) return null
    switch (insights.trend) {
      case 'improving': return <TrendingUp className="h-5 w-5 text-green-500" />
      case 'declining': return <TrendingDown className="h-5 w-5 text-red-500" />
      case 'stable': return <Minus className="h-5 w-5 text-yellow-500" />
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getTrendLabel = () => {
    if (!insights) return ''
    switch (insights.trend) {
      case 'improving': return 'משתפר'
      case 'declining': return 'יורד'
      case 'stable': return 'יציב'
      default: return 'אין מספיק נתונים'
    }
  }

  const getAccuracyColor = (score: number) => {
    if (score >= 90) return 'bg-green-500'
    if (score >= 80) return 'bg-blue-500'
    if (score >= 70) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">דאשבורד למידה ושיפור</h1>
          <p className="text-muted-foreground mt-1">
            מעקב אחרי דיוק החיזויים ושיפור מתמיד של המודל
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={checkAccuracyNow} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
            בדוק דיוק עכשיו
          </Button>
          <Button onClick={refreshPredictionsNow} disabled={refreshing}>
            <Calendar className="h-4 w-4 ml-2" />
            רענן חיזויים
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>סה"כ חיזויים נבדקו</CardDescription>
            <CardTitle className="text-3xl">{insights?.totalPredictions || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>דיוק ממוצע</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {insights?.avgAccuracy || '0'}%
              <Badge className={getAccuracyColor(parseFloat(insights?.avgAccuracy || '0'))}>
                {parseFloat(insights?.avgAccuracy || '0') >= 80 ? 'מצוין' : 
                 parseFloat(insights?.avgAccuracy || '0') >= 70 ? 'טוב' : 'צריך שיפור'}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>מגמה</CardDescription>
            <CardTitle className="flex items-center gap-2">
              {getTrendIcon()}
              {getTrendLabel()}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>רענון אחרון</CardDescription>
            <CardTitle className="text-lg">
              {lastRefresh ? (
                <>
                  {new Date(lastRefresh.time).toLocaleDateString('he-IL')}
                  <div className="text-sm text-muted-foreground mt-1">
                    {lastRefresh.predictionsGenerated} חיזויים
                  </div>
                </>
              ) : (
                'לא זמין'
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recommendations */}
      {insights && insights.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              המלצות לשיפור
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <CheckCircle className="h-5 w-5 mt-0.5 text-blue-500 flex-shrink-0" />
                <p className="text-sm">{rec}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Analysis */}
      <Tabs defaultValue="recent" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">חיזויים אחרונים</TabsTrigger>
          <TabsTrigger value="accuracy">התפלגות דיוק</TabsTrigger>
          <TabsTrigger value="performance">ביצועי מודל</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>חיזויים אחרונים - השוואה למציאות</CardTitle>
              <CardDescription>
                30 החיזויים האחרונים שהושוו למחירים בפועל
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights && insights.accuracyData.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {insights.accuracyData.slice(0, 30).map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex-1">
                        <div className="font-medium">{new Date(item.prediction_date).toLocaleDateString('he-IL')}</div>
                        <div className="text-sm text-muted-foreground">
                          חזוי: ₪{item.predicted_price} | בפועל: ₪{item.actual_price}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={item.price_error_percent < 10 ? 'default' : item.price_error_percent < 20 ? 'secondary' : 'destructive'}>
                          {item.price_error_percent.toFixed(1)}% שגיאה
                        </Badge>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-24 bg-gray-200 rounded-full overflow-hidden`}>
                            <div 
                              className={`h-full ${getAccuracyColor(item.accuracy_score)}`}
                              style={{ width: `${item.accuracy_score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{item.accuracy_score.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>אין עדיין נתוני דיוק - החיזויים צריכים להגיע לתאריך בפועל</p>
                  <Button onClick={checkAccuracyNow} className="mt-4" variant="outline">
                    בדוק עכשיו
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accuracy">
          <Card>
            <CardHeader>
              <CardTitle>התפלגות דיוק</CardTitle>
            </CardHeader>
            <CardContent>
              {insights && insights.accuracyData.length > 0 ? (
                <div className="space-y-4">
                  {[
                    { label: 'מצוין (90%+)', min: 90, color: 'bg-green-500' },
                    { label: 'טוב מאוד (80-89%)', min: 80, max: 89, color: 'bg-blue-500' },
                    { label: 'טוב (70-79%)', min: 70, max: 79, color: 'bg-yellow-500' },
                    { label: 'בינוני (60-69%)', min: 60, max: 69, color: 'bg-orange-500' },
                    { label: 'צריך שיפור (<60%)', max: 59, color: 'bg-red-500' }
                  ].map((range) => {
                    const count = insights.accuracyData.filter(d => {
                      if (range.min && range.max) return d.accuracy_score >= range.min && d.accuracy_score <= range.max
                      if (range.min) return d.accuracy_score >= range.min
                      return d.accuracy_score <= (range.max || 0)
                    }).length
                    const percent = (count / insights.accuracyData.length) * 100

                    return (
                      <div key={range.label}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{range.label}</span>
                          <span className="text-sm text-muted-foreground">{count} ({percent.toFixed(1)}%)</span>
                        </div>
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${range.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  אין נתונים להצגה
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>ביצועי מודל לאורך זמן</CardTitle>
            </CardHeader>
            <CardContent>
              {insights && insights.performanceSummaries && insights.performanceSummaries.length > 0 ? (
                <div className="space-y-4">
                  {insights.performanceSummaries.map((summary, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium">
                            {new Date(summary.period_start).toLocaleDateString('he-IL')} - {new Date(summary.period_end).toLocaleDateString('he-IL')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {summary.total_predictions} חיזויים
                          </div>
                        </div>
                        <Badge className={getAccuracyColor(summary.avg_accuracy_score)}>
                          {summary.avg_accuracy_score.toFixed(1)}% דיוק
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">מצוין</div>
                          <div className="font-medium text-green-600">{summary.very_accurate_count}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">טוב</div>
                          <div className="font-medium text-blue-600">{summary.accurate_count}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">בינוני</div>
                          <div className="font-medium text-yellow-600">{summary.moderate_count}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">חלש</div>
                          <div className="font-medium text-red-600">{summary.poor_count}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  אין עדיין סיכומי ביצועים
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
