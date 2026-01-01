"use client"

import { useState, useEffect } from "react"
import { BudgetDashboard } from "@/components/budget-dashboard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2Icon } from "lucide-react"

interface Hotel {
  id: string
  name: string
  total_rooms: number
  base_price: number
}

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
  totalRooms: number
  currentOccupancy: number
  avgRoomPrice: number
}

interface Props {
  hotels: Hotel[]
}

export function BudgetAnalysisClient({ hotels }: Props) {
  const currentDate = new Date()
  const [selectedHotelId, setSelectedHotelId] = useState(hotels[0]?.id || '')
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const years = [2025, 2026, 2027]
  const months = [
    { value: 1, label: 'ינואר' },
    { value: 2, label: 'פברואר' },
    { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' },
    { value: 5, label: 'מאי' },
    { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' },
    { value: 8, label: 'אוגוסט' },
    { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' },
    { value: 11, label: 'נובמבר' },
    { value: 12, label: 'דצמבר' },
  ]

  useEffect(() => {
    fetchAnalysis()
  }, [selectedHotelId, selectedYear, selectedMonth])

  const fetchAnalysis = async () => {
    if (!selectedHotelId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/budget/analysis?hotelId=${selectedHotelId}&year=${selectedYear}&month=${selectedMonth}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analysis')
      }

      setAnalysis(data)
    } catch (err) {
      console.error('Error fetching budget analysis:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">ניתוח תקציב מתקדם</h1>
          <p className="text-slate-400 mt-2">דשבורד פיננסי עם חיזוי הכנסות והמלצות Multi-Agent</p>
        </div>
        <Badge variant="outline" className="text-sm px-4 py-2">
          Live Dashboard
        </Badge>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg text-white">בחר מלון ותקופה</CardTitle>
          <CardDescription>בחר מלון, שנה וחודש לניתוח</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Hotel Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">מלון</label>
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

            {/* Year Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">שנה</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Month Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">חודש</label>
              <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Content */}
      {loading && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="py-20">
            <div className="flex flex-col items-center justify-center gap-4">
              <Loader2Icon className="h-12 w-12 text-blue-400 animate-spin" />
              <p className="text-slate-400">טוען ניתוח...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400">שגיאה</CardTitle>
            <CardDescription className="text-red-300">{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!loading && !error && analysis && analysis.targetRevenue > 0 && (
        <BudgetDashboard
          analysis={analysis}
          totalRooms={analysis.totalRooms}
          currentOccupancy={analysis.currentOccupancy}
          avgRoomPrice={analysis.avgRoomPrice}
        />
      )}

      {!loading && !error && analysis && analysis.targetRevenue === 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardHeader>
            <CardTitle className="text-yellow-400">אין יעד תקציב</CardTitle>
            <CardDescription className="text-yellow-300">
              לא הוגדר יעד תקציב עבור {months.find(m => m.value === selectedMonth)?.label} {selectedYear}.
              גש לדף התקציב כדי להגדיר יעד.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
