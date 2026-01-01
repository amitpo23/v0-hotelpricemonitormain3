"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, TrendingUp, DollarSign, Target, Brain, CheckCircle2 } from "lucide-react"

interface PredictionLog {
  id: string
  created_at: string
  hotel_name: string
  prediction_date: string
  algorithm_version: string
  execution_time_ms?: number
  multi_agent_data?: any
  input_data?: any
  factors?: any
  price_calculation?: any
  confidence_calculation?: any
  result?: any
}

interface PredictionLogViewerProps {
  hotelId: string
  predictionDate: string
  hotelName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PredictionLogViewer({
  hotelId,
  predictionDate,
  hotelName,
  open,
  onOpenChange,
}: PredictionLogViewerProps) {
  const [log, setLog] = useState<PredictionLog | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchLog = async () => {
    if (!open) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/predictions/logs?hotelId=${hotelId}&predictionDate=${predictionDate}&latest=true`
      )
      const data = await response.json()

      if (data.success && data.logs.length > 0) {
        setLog(data.logs[0])
      } else {
        setLog(null)
      }
    } catch (error) {
      console.error("Error fetching prediction log:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch log when dialog opens
  useState(() => {
    if (open) {
      fetchLog()
    }
  })

  if (!log && !loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>לוגים מפורטים - {hotelName}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            {loading ? "טוען..." : "אין לוגים זמינים עבור חיזוי זה"}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            לוגים מפורטים - {hotelName}
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            תאריך: {new Date(predictionDate).toLocaleDateString("he-IL")} | גרסה: {log?.algorithm_version}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">טוען...</div>
        ) : log ? (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">סקירה</TabsTrigger>
              <TabsTrigger value="multiagent">Multi-Agent</TabsTrigger>
              <TabsTrigger value="factors">פקטורים</TabsTrigger>
              <TabsTrigger value="price">מחיר</TabsTrigger>
              <TabsTrigger value="confidence">Confidence</TabsTrigger>
              <TabsTrigger value="result">תוצאה</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    מחיר מחויה
                  </h3>
                  <div className="text-3xl font-bold text-primary">
                    ₪{log.result?.predictedPrice?.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    מחיר בסיס: ₪{log.result?.basePrice?.toLocaleString()}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Confidence
                  </h3>
                  <div className="text-3xl font-bold text-green-600">
                    {(log.result?.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    רמת ביקוש: {log.result?.demand}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-2">נתוני קלט</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">תוצאות סריקה:</span>
                    <span className="font-semibold mr-2">{log.input_data?.scanResults || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">הזמנות:</span>
                    <span className="font-semibold mr-2">{log.input_data?.bookings || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">מחירי מתחרים:</span>
                    <span className="font-semibold mr-2">{log.input_data?.competitorPrices || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">חדרים תפוסים:</span>
                    <span className="font-semibold mr-2">
                      {log.input_data?.bookedRooms}/{log.input_data?.totalRooms}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">מתחרים ממוצע:</span>
                    <span className="font-semibold mr-2">
                      {log.input_data?.competitorAvg ? `₪${Math.round(log.input_data.competitorAvg)}` : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">סריקה אחרונה:</span>
                    <span className="font-semibold mr-2">
                      {log.input_data?.lastScanHoursAgo
                        ? `${Math.round(log.input_data.lastScanHoursAgo)} שעות`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {log.result?.recommendation && (
                <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
                  <h3 className="font-semibold mb-1 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    המלצה
                  </h3>
                  <p className="text-sm">{log.result.recommendation}</p>
                  <Badge variant="outline" className="mt-2">
                    {log.result.recommendationType}
                  </Badge>
                </div>
              )}
            </TabsContent>

            {/* Multi-Agent Tab */}
            <TabsContent value="multiagent" className="space-y-4">
              {log.multi_agent_data ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2">Events Agent</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          אירועים: <span className="font-semibold">{log.multi_agent_data.eventsFound || 0}</span>
                        </div>
                        <div>
                          Confidence:{" "}
                          <span className="font-semibold">
                            {((log.multi_agent_data.eventsConfidence || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2">Historical Agent</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          נתונים: <span className="font-semibold">{log.multi_agent_data.historicalData || 0}</span>
                        </div>
                        <div>
                          Confidence:{" "}
                          <span className="font-semibold">
                            {((log.multi_agent_data.historicalConfidence || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div>
                          מגמה: <span className="font-semibold">{log.multi_agent_data.historicalTrend || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2">Statistics Agent</h4>
                      <div className="space-y-1 text-sm">
                        <div>
                          Confidence:{" "}
                          <span className="font-semibold">
                            {((log.multi_agent_data.statisticsConfidence || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        {log.multi_agent_data.marketAvgPrice && (
                          <div>
                            מחיר שוק: <span className="font-semibold">₪{Math.round(log.multi_agent_data.marketAvgPrice)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-2">אירועים שזוהו</h4>
                    {log.multi_agent_data.eventsList && log.multi_agent_data.eventsList.length > 0 ? (
                      <div className="space-y-2">
                        {log.multi_agent_data.eventsList.map((event: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm border-b pb-2">
                            <span>{event.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{new Date(event.date).toLocaleDateString("he-IL")}</Badge>
                              <Badge>{(event.impact * 100 - 100).toFixed(0)}%</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">לא נמצאו אירועים</p>
                    )}
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-2">סיכום</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        Overall Confidence:{" "}
                        <span className="font-semibold">
                          {((log.multi_agent_data.overallConfidence || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        Data Quality: <span className="font-semibold">{log.multi_agent_data.dataQuality || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Multi-Agent System לא היה זמין עבור חיזוי זה
                </div>
              )}
            </TabsContent>

            {/* Factors Tab */}
            <TabsContent value="factors" className="space-y-4">
              {log.factors ? (
                <div className="space-y-3">
                  {Object.entries(log.factors).map(([key, factor]: [string, any]) => {
                    const impactColors = {
                      high: "text-red-600 bg-red-50 border-red-200",
                      medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
                      low: "text-gray-600 bg-gray-50 border-gray-200",
                    }
                    const impactIcons = { high: "🔴", medium: "🟡", low: "⚪" }

                    return (
                      <div
                        key={key}
                        className={`rounded-lg border p-4 ${impactColors[factor.impact as keyof typeof impactColors]}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold flex items-center gap-2">
                            <span>{impactIcons[factor.impact as keyof typeof impactIcons]}</span>
                            {key === "seasonality" && "עונתיות"}
                            {key === "weekendPremium" && "סוף שבוע"}
                            {key === "leadTime" && "Lead Time"}
                            {key === "occupancy" && "תפוסה"}
                            {key === "events" && "אירועים"}
                            {key === "competitor" && "מתחרים"}
                            {key === "budget" && "תקציב"}
                            {key === "velocity" && "מהירות שוק"}
                          </h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{factor.value.toFixed(3)}</Badge>
                            {factor.calculation && <Badge>{factor.calculation}</Badge>}
                          </div>
                        </div>
                        <p className="text-sm">{factor.reasoning}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">אין נתוני פקטורים זמינים</div>
              )}
            </TabsContent>

            {/* Price Calculation Tab */}
            <TabsContent value="price" className="space-y-4">
              {log.price_calculation ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2">מחיר גולמי (Raw)</h4>
                      <div className="text-2xl font-bold">₪{Math.round(log.price_calculation.rawPrice)}</div>
                      <p className="text-sm text-muted-foreground mt-1">לפני רצפות מחיר</p>
                    </div>

                    <div className="rounded-lg border p-4 bg-primary/5">
                      <h4 className="font-semibold mb-2">מחיר סופי</h4>
                      <div className="text-2xl font-bold text-primary">
                        ₪{Math.round(log.price_calculation.finalPrice)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">אחרי כל ההתאמות</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-3">רצפות מחיר (Price Floors)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>מינימום מוחלט:</span>
                        <span className="font-semibold">₪{log.price_calculation.floors.absolute}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>רצפת מתחרים:</span>
                        <span className="font-semibold">₪{Math.round(log.price_calculation.floors.competitor)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>רצפת סטטיסטיקות ממשלתיות:</span>
                        <span className="font-semibold">₪{Math.round(log.price_calculation.floors.govStats)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>רצפת מחיר נוכחי:</span>
                        <span className="font-semibold">₪{Math.round(log.price_calculation.floors.currentPrice)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-semibold">
                        <span>רצפה שהוחלה (הגבוהה ביותר):</span>
                        <span className="text-primary">₪{Math.round(log.price_calculation.floors.applied)}</span>
                      </div>
                    </div>
                  </div>

                  {log.price_calculation.adjustments && log.price_calculation.adjustments.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2">התאמות שבוצעו</h4>
                      <ul className="space-y-1">
                        {log.price_calculation.adjustments.map((adj: string, idx: number) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                            <span>{adj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg border p-3">
                      <span className="text-muted-foreground">רצפה הוחלה:</span>
                      <span className="font-semibold mr-2">
                        {log.price_calculation.floorApplied ? "כן ✅" : "לא ❌"}
                      </span>
                    </div>
                    <div className="rounded-lg border p-3">
                      <span className="text-muted-foreground">עיגול בוצע:</span>
                      <span className="font-semibold mr-2">
                        {log.price_calculation.roundingApplied ? "כן ✅" : "לא ❌"}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">אין נתוני חישוב מחיר זמינים</div>
              )}
            </TabsContent>

            {/* Confidence Calculation Tab */}
            <TabsContent value="confidence" className="space-y-4">
              {log.confidence_calculation ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <h4 className="font-semibold mb-2">Base Confidence</h4>
                      <div className="text-2xl font-bold">
                        {(log.confidence_calculation.baseConfidence * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-green-50">
                      <h4 className="font-semibold mb-2">Final Confidence</h4>
                      <div className="text-2xl font-bold text-green-600">
                        {(log.confidence_calculation.finalConfidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-3">פקטורי Confidence</h4>
                    <div className="space-y-2">
                      {Object.entries(log.confidence_calculation.factors).map(([key, value]: [string, any]) => {
                        const weight = log.confidence_calculation.weights[key]
                        return (
                          <div key={key} className="flex items-center justify-between text-sm">
                            <span className="capitalize">{key}:</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${value * 100}%` }}
                                />
                              </div>
                              <span className="font-semibold w-12">{(value * 100).toFixed(0)}%</span>
                              <Badge variant="outline" className="w-12">
                                {(weight * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-3">התאמות</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Time Distance Factor:</span>
                        <span className="font-semibold">
                          {log.confidence_calculation.adjustments.timeDistance.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Event Bonus (+8%):</span>
                        <span className="font-semibold">
                          {log.confidence_calculation.adjustments.eventBonus ? "✅ כן" : "❌ לא"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Historical Bonus (+12%):</span>
                        <span className="font-semibold">
                          {log.confidence_calculation.adjustments.historicalBonus ? "✅ כן" : "❌ לא"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Near-Term Bonus (+15%):</span>
                        <span className="font-semibold">
                          {log.confidence_calculation.adjustments.nearTermBonus ? "✅ כן" : "❌ לא"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">
                      ימים עד תאריך: <span className="font-semibold">{log.confidence_calculation.daysUntilDate}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">אין נתוני confidence זמינים</div>
              )}
            </TabsContent>

            {/* Result Tab */}
            <TabsContent value="result" className="space-y-4">
              {log.result ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-6 bg-gradient-to-br from-primary/10 to-primary/5">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">מחיר מחויה סופי</h4>
                      <div className="text-4xl font-bold text-primary">₪{log.result.predictedPrice.toLocaleString()}</div>
                      <div className="mt-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">מחיר בסיס:</span>
                          <span className="font-semibold">₪{log.result.basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">שינוי:</span>
                          <span
                            className={`font-semibold ${log.result.priceVsBase > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {log.result.priceVsBase > 0 ? "+" : ""}
                            {log.result.priceVsBase.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border p-6">
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">ביצועים</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-green-500 h-3 rounded-full"
                                style={{ width: `${log.result.confidence * 100}%` }}
                              />
                            </div>
                            <span className="font-semibold text-lg">{(log.result.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">רמת ביקוש</div>
                          <Badge
                            variant={
                              log.result.demand === "very_high"
                                ? "default"
                                : log.result.demand === "high"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-base"
                          >
                            {log.result.demand}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h4 className="font-semibold mb-3">השוואה למתחרים</h4>
                    <div className="text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">שינוי לעומת מתחרים:</span>
                        <span
                          className={`font-semibold text-lg ${log.result.priceVsCompetitor > 0 ? "text-orange-600" : "text-green-600"}`}
                        >
                          {log.result.priceVsCompetitor > 0 ? "+" : ""}
                          {log.result.priceVsCompetitor.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {log.result.priceVsCompetitor > 15
                          ? "⚠️ המחיר שלך גבוה משמעותית מהמתחרים"
                          : log.result.priceVsCompetitor < -15
                            ? "💡 יש מקום להעלות מחיר"
                            : "✅ מחיר תחרותי"}
                      </p>
                    </div>
                  </div>

                  {log.result.recommendation && (
                    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        המלצה אסטרטגית
                      </h4>
                      <p className="text-sm mb-2">{log.result.recommendation}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{log.result.recommendationType}</Badge>
                        {log.result.recommendationType === "price_increase" && <span>📈</span>}
                        {log.result.recommendationType === "promotion" && <span>🎁</span>}
                        {log.result.recommendationType === "competitor_alert" && <span>⚠️</span>}
                        {log.result.recommendationType === "opportunity" && <span>💡</span>}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">אין נתוני תוצאה זמינים</div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
