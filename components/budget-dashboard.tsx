"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  TargetIcon, 
  CalendarIcon,
  DollarSignIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  BedDoubleIcon,
  UsersIcon
} from "lucide-react"

interface BudgetAnalysis {
  hotelId: string
  hotelName: string
  targetRevenue: number
  actualRevenue: number
  bookedRevenue: number
  totalExpectedRevenue: number
  budgetGap: number
  budgetGapPercent: number
  daysInMonth: number
  daysElapsed: number
  daysRemaining: number
  dailyRevenueNeeded: number
  dailyRevenueActual: number
  bookingsNeeded: number
  avgPriceNeeded: number
  performanceStatus: 'excellent' | 'good' | 'warning' | 'critical'
  recommendation: string
  // Autopilot Forecast Data
  autopilotForecast?: {
    forecastedRevenue: number
    revenueWithAutopilot: number
    budgetGapWithAutopilot: number
    budgetGapPercentWithAutopilot: number
    revenueIncrease: number
    percentIncrease: number
    confidence: number
    summary?: any
    riskAssessment?: any
  } | null
}

interface Props {
  analysis: BudgetAnalysis
  totalRooms: number
  currentOccupancy: number
  avgRoomPrice: number
}

export function BudgetDashboard({ analysis, totalRooms, currentOccupancy, avgRoomPrice }: Props) {
  const {
    hotelName,
    targetRevenue,
    actualRevenue,
    bookedRevenue,
    totalExpectedRevenue,
    budgetGap,
    budgetGapPercent,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    dailyRevenueNeeded,
    dailyRevenueActual,
    bookingsNeeded,
    avgPriceNeeded,
    performanceStatus,
    recommendation
  } = analysis

  // Calculate bookings needed to reach budget
  const roomsNeededPerDay = Math.ceil((dailyRevenueNeeded / avgRoomPrice) || 0)
  const totalBookingsNeeded = Math.ceil((budgetGap / avgRoomPrice) || 0)
  
  // Calculate if achievable with current occupancy
  const maxPossibleBookings = totalRooms * daysRemaining
  const achievableWithCurrentOccupancy = totalBookingsNeeded <= maxPossibleBookings * (currentOccupancy / 100)

  // Status colors
  const statusConfig = {
    excellent: { color: 'bg-green-500', text: 'text-green-400', label: 'מצוין' },
    good: { color: 'bg-blue-500', text: 'text-blue-400', label: 'טוב' },
    warning: { color: 'bg-yellow-500', text: 'text-yellow-400', label: 'אזהרה' },
    critical: { color: 'bg-red-500', text: 'text-red-400', label: 'קריטי' }
  }

  const status = statusConfig[performanceStatus]
  const progress = (actualRevenue / targetRevenue) * 100
  const expectedProgress = (daysElapsed / daysInMonth) * 100

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">{hotelName}</h2>
          <p className="text-slate-400">ניתוח פיננסי וחיזוי הכנסות</p>
        </div>
        <Badge className={`${status.color} text-white px-4 py-2 text-lg`}>
          {status.label}
        </Badge>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Target Revenue */}
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <DollarSignIcon className="h-6 w-6 text-blue-400" />
              </div>
              <Badge variant="outline" className="text-xs">תקציב</Badge>
            </div>
            <div className="text-3xl font-bold text-white">
              ₪{targetRevenue.toLocaleString()}
            </div>
            <p className="text-sm text-slate-400 mt-1">הכנסות מתוכננת</p>
          </CardContent>
        </Card>

        {/* Actual Revenue */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-purple-400" />
              </div>
              <Badge variant="outline" className="text-xs">חיזוי</Badge>
            </div>
            <div className="text-3xl font-bold text-white">
              ₪{analysis.autopilotForecast ? analysis.autopilotForecast.revenueWithAutopilot.toLocaleString() : totalExpectedRevenue.toLocaleString()}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {analysis.autopilotForecast ? 'עם Autopilot' : 'צפי ללא AI'}
            </p>
          </CardContent>
        </Card>

        {/* Revenue Increase */}
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <TrendingUpIcon className="h-6 w-6 text-green-400" />
              </div>
              <Badge variant="outline" className="text-xs">עלייה</Badge>
            </div>
            <div className="text-3xl font-bold text-green-400">
              {analysis.autopilotForecast ? (
                <>+₪{analysis.autopilotForecast.revenueIncrease.toLocaleString()}</>
              ) : (
                <>₪{totalExpectedRevenue.toLocaleString()}</>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {analysis.autopilotForecast ? `+${analysis.autopilotForecast.percentIncrease.toFixed(1)}%` : 'צפי נוכחי'}
            </p>
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Card className="bg-gradient-to-br from-slate-500/10 to-slate-600/10 border-slate-500/30">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-slate-500/20 rounded-xl">
                <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <Badge variant="outline" className="text-xs">סיכון</Badge>
            </div>
            <div className="text-3xl font-bold text-white">
              {analysis.autopilotForecast?.riskAssessment ? (
                analysis.autopilotForecast.riskAssessment.level === 'low' ? 'נמוך' :
                analysis.autopilotForecast.riskAssessment.level === 'medium' ? 'בינוני' : 'גבוה'
              ) : 'לא ידוע'}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {daysRemaining > 0 ? `יימי ${daysRemaining}` : 'החודש הסתיים'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-white">התקדמות לעומת יעד</CardTitle>
          <CardDescription>ימים {daysElapsed} מתוך {daysInMonth} בחודש</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Actual Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">התקדמות בפועל</span>
              <span className={`font-bold ${status.text}`}>{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Expected Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">התקדמות צפויה</span>
              <span className="font-bold text-blue-400">{expectedProgress.toFixed(1)}%</span>
            </div>
            <Progress value={expectedProgress} className="h-3 bg-slate-700" />
          </div>

          {/* Gap Indicator */}
          <div className="flex items-center gap-2 pt-2">
            {progress >= expectedProgress ? (
              <>
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <span className="text-sm text-green-400">
                  מעל הקצב הנדרש! (+{(progress - expectedProgress).toFixed(1)}%)
                </span>
              </>
            ) : (
              <>
                <AlertTriangleIcon className="h-5 w-5 text-yellow-400" />
                <span className="text-sm text-yellow-400">
                  מתחת לקצב הנדרש (-{(expectedProgress - progress).toFixed(1)}%)
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Needed */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BedDoubleIcon className="h-5 w-5 text-cyan-400" />
              כמה הזמנות חסרות?
            </CardTitle>
            <CardDescription>כדי להגיע ליעד התקציב</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Total Bookings Needed */}
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div>
                <p className="text-sm text-slate-400">סה"כ הזמנות נדרשות</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {totalBookingsNeeded}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">ב-{daysRemaining} ימים</p>
                <p className="text-sm font-bold text-cyan-400 mt-1">
                  ~{roomsNeededPerDay} ליום
                </p>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">הכנסה נדרשת ליום</p>
                <p className="text-lg font-bold text-white">
                  ₪{Math.round(dailyRevenueNeeded).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-800/30 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">הכנסה בפועל ליום</p>
                <p className="text-lg font-bold text-white">
                  ₪{Math.round(dailyRevenueActual).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Achievability Check */}
            <div className={`p-4 rounded-lg ${achievableWithCurrentOccupancy ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-start gap-3">
                {achievableWithCurrentOccupancy ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5" />
                ) : (
                  <AlertTriangleIcon className="h-5 w-5 text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${achievableWithCurrentOccupancy ? 'text-green-400' : 'text-red-400'}`}>
                    {achievableWithCurrentOccupancy ? 'יעד אפשרי!' : 'יעד בלתי אפשרי'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {achievableWithCurrentOccupancy 
                      ? `עם תפוסה של ${currentOccupancy}%, אפשר להגיע ליעד`
                      : `עם ${totalRooms} חדרים ו-${daysRemaining} ימים, לא ניתן להגיע ליעד`
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Room Availability */}
            <div className="pt-2 border-t border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">חדרים זמינים (מקס)</span>
                <span className="font-bold text-white">
                  {maxPossibleBookings} לילות חדר
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-slate-400">נדרש לסגירת פער</span>
                <span className="font-bold text-cyan-400">
                  {totalBookingsNeeded} לילות חדר
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Forecast */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUpIcon className="h-5 w-5 text-purple-400" />
              חיזוי הכנסות עד סוף החודש
            </CardTitle>
            <CardDescription>לפי קצב ההזמנות הנוכחי</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Projected Revenue */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30">
              <p className="text-sm text-slate-400 mb-2">הכנסות צפויות סוף חודש</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-white">
                  ₪{totalExpectedRevenue.toLocaleString()}
                </p>
                <Badge variant="outline" className="text-xs">
                  {((totalExpectedRevenue / targetRevenue) * 100).toFixed(1)}% מיעד
                </Badge>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-sm text-slate-400">הכנסות עד כה</span>
                <span className="font-bold text-green-400">
                  ₪{actualRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-sm text-slate-400">הזמנות מאושרות</span>
                <span className="font-bold text-purple-400">
                  ₪{bookedRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-slate-800/30 rounded-lg">
                <span className="text-sm text-slate-400">סה"כ צפוי</span>
                <span className="font-bold text-cyan-400">
                  ₪{totalExpectedRevenue.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Gap to target */}
            {budgetGap > 0 && (
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">עדיין חסר</p>
                    <p className="text-xl font-bold text-red-400">
                      ₪{budgetGap.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">ב-{daysRemaining} ימים</p>
                    <p className="text-sm font-bold text-red-400">
                      ~₪{Math.round(dailyRevenueNeeded).toLocaleString()}/יום
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendation */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <UsersIcon className="h-5 w-5 text-blue-400" />
            המלצת Multi-Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white text-lg leading-relaxed">
            {recommendation}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
