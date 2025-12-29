"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCwIcon, TrendingUpIcon, TrendingDownIcon, CalendarIcon, DollarSignIcon } from "@/components/icons"
import { createClient } from "@/lib/supabase/client"

interface MonthlyForecast {
  month: string
  predicted_avg_price: number
  predicted_min_price: number
  predicted_max_price: number
  expected_demand: number
  confidence_score: number
  total_days: number
  updated_at: string
}

export function LivePredictions() {
  const [forecasts, setForecasts] = useState<MonthlyForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const supabase = createClient()

  const loadForecasts = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_forecasts')
        .select('*')
        .order('month', { ascending: true })
        .limit(12)

      if (error) throw error

      setForecasts(data || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('שגיאה בטעינת תחזיות:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForecasts()

    // Auto-refresh every 5 minutes
    if (autoRefresh) {
      const interval = setInterval(loadForecasts, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-')
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ]
    return `${monthNames[parseInt(m) - 1]} ${year}`
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500'
    if (confidence >= 0.75) return 'bg-blue-500'
    if (confidence >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'גבוהה מאוד'
    if (confidence >= 0.75) return 'גבוהה'
    if (confidence >= 0.6) return 'בינונית'
    return 'נמוכה'
  }

  const calculateTrend = (index: number): 'up' | 'down' | 'stable' => {
    if (index === 0) return 'stable'
    const current = forecasts[index].predicted_avg_price
    const previous = forecasts[index - 1].predicted_avg_price
    const diff = ((current - previous) / previous) * 100
    if (diff > 2) return 'up'
    if (diff < -2) return 'down'
    return 'stable'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCwIcon className="h-5 w-5 animate-spin" />
            טוען תחזיות...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSignIcon className="h-6 w-6" />
                תחזיות מחירים חיות - 12 חודשים קדימה
              </CardTitle>
              <CardDescription className="mt-2">
                מתעדכן אוטומטית כל שעה על בסיס הנתונים האחרונים מהמתחרים
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={() => loadForecasts()}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                <RefreshCwIcon className="h-4 w-4" />
                רענן עכשיו
              </button>
              {lastUpdate && (
                <p className="text-xs text-muted-foreground">
                  עדכון אחרון: {lastUpdate.toLocaleTimeString('he-IL')}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Monthly Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forecasts.map((forecast, index) => {
          const trend = calculateTrend(index)
          const isCurrentMonth = forecast.month === new Date().toISOString().slice(0, 7)

          return (
            <Card key={forecast.month} className={isCurrentMonth ? 'border-2 border-blue-500' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {formatMonth(forecast.month)}
                  </CardTitle>
                  {isCurrentMonth && (
                    <Badge variant="default">החודש</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Average Price */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">מחיר ממוצע</p>
                    <p className="text-2xl font-bold">
                      ₪{forecast.predicted_avg_price.toLocaleString()}
                    </p>
                  </div>
                  {trend !== 'stable' && (
                    <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                      {trend === 'up' ? (
                        <TrendingUpIcon className="h-5 w-5" />
                      ) : (
                        <TrendingDownIcon className="h-5 w-5" />
                      )}
                    </div>
                  )}
                </div>

                {/* Price Range */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                    <p className="text-xs text-muted-foreground">מינימום</p>
                    <p className="font-semibold">₪{forecast.predicted_min_price.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-red-50 dark:bg-red-950 rounded">
                    <p className="text-xs text-muted-foreground">מקסימום</p>
                    <p className="font-semibold">₪{forecast.predicted_max_price.toLocaleString()}</p>
                  </div>
                </div>

                {/* Demand & Confidence */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ביקוש צפוי</span>
                    <span className="font-medium">{(forecast.expected_demand * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">רמת ביטחון</span>
                    <Badge className={`${getConfidenceColor(forecast.confidence_score)} text-white`}>
                      {getConfidenceText(forecast.confidence_score)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ימים</span>
                    <span className="font-medium">{forecast.total_days}</span>
                  </div>
                </div>

                {/* Update Time */}
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  עודכן: {new Date(forecast.updated_at).toLocaleString('he-IL')}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Summary Statistics */}
      {forecasts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>סיכום שנתי</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">מחיר ממוצע שנתי</p>
                <p className="text-2xl font-bold">
                  ₪{Math.round(forecasts.reduce((sum, f) => sum + f.predicted_avg_price, 0) / forecasts.length).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">מחיר מינימום</p>
                <p className="text-2xl font-bold text-green-600">
                  ₪{Math.min(...forecasts.map(f => f.predicted_min_price)).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">מחיר מקסימום</p>
                <p className="text-2xl font-bold text-red-600">
                  ₪{Math.max(...forecasts.map(f => f.predicted_max_price)).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ביטחון ממוצע</p>
                <p className="text-2xl font-bold">
                  {(forecasts.reduce((sum, f) => sum + f.confidence_score, 0) / forecasts.length * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {forecasts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              אין תחזיות זמינות כרגע. התחזיות יתעדכנו אוטומטית בשעה הקרובה.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
