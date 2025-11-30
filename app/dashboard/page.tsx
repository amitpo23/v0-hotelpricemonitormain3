import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  TrendingUpIcon,
  DollarSignIcon,
  ZapIcon,
  AlertTriangleIcon,
  BarChartIcon,
  BuildingIcon,
  BrainIcon,
  GaugeIcon,
  ClockIcon,
  CheckCircleIcon,
  BotIcon,
  TargetIcon,
  CalendarIcon,
  UsersIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
} from "@/components/icons"
import { DashboardCharts } from "./dashboard-charts"

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const today = now.toISOString().split("T")[0]

  const [
    { data: hotels },
    { data: scanResults },
    { data: dailyPrices },
    { data: predictions },
    { data: autopilotRules },
    { data: autopilotLogs },
    { data: trends },
    { data: alerts },
    { data: revenue },
    { data: budgets },
    { data: competitors },
    { data: competitorPrices },
    { data: allBookings },
    { data: confirmedBookings },
  ] = await Promise.all([
    supabase.from("hotels").select("*"),
    supabase.from("scan_results").select("*").order("scraped_at", { ascending: false }).limit(100),
    supabase
      .from("daily_prices")
      .select("*")
      .gte("date", now.toISOString().split("T")[0])
      .order("date", { ascending: true }),
    supabase.from("price_predictions").select("*").order("prediction_date", { ascending: true }).limit(30),
    supabase.from("autopilot_rules").select("*").eq("is_active", true),
    supabase.from("autopilot_logs").select("*").order("executed_at", { ascending: false }).limit(10),
    supabase.from("market_trends").select("*").order("detected_at", { ascending: false }).limit(10),
    supabase.from("pricing_alerts").select("*").eq("is_read", false).order("created_at", { ascending: false }),
    supabase.from("revenue_tracking").select("*").order("date", { ascending: false }).limit(30),
    supabase.from("revenue_budgets").select("*").eq("year", currentYear).eq("month", currentMonth),
    supabase.from("hotel_competitors").select("*").eq("is_active", true),
    supabase
      .from("competitor_daily_prices")
      .select("*")
      .gte("date", now.toISOString().split("T")[0])
      .order("date", { ascending: true }),
    // Get all bookings for stats
    supabase
      .from("bookings")
      .select("*"),
    // Get confirmed future bookings
    supabase
      .from("bookings")
      .select("*")
      .eq("status", "confirmed")
      .gte("check_in_date", today),
  ])

  const totalBookings = allBookings?.length || 0
  const confirmedCount = allBookings?.filter((b: any) => b.status === "confirmed").length || 0
  const cancelledCount = allBookings?.filter((b: any) => b.status === "cancelled").length || 0
  const cancelRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0

  const totalRevenue = allBookings?.reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0) || 0
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

  // Calculate total nights and ADR
  const totalNights =
    allBookings?.reduce((sum: number, b: any) => {
      const checkIn = new Date(b.check_in_date)
      const checkOut = new Date(b.check_out_date)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      return sum + (nights > 0 ? nights : 0)
    }, 0) || 0
  const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0

  // Future bookings stats
  const futureBookingsCount = confirmedBookings?.length || 0
  const futureRevenue = confirmedBookings?.reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0) || 0

  // Bookings by source
  const bookingsBySource: Record<string, { count: number; revenue: number }> = {}
  allBookings?.forEach((b: any) => {
    const source = b.booking_source || "Direct"
    if (!bookingsBySource[source]) {
      bookingsBySource[source] = { count: 0, revenue: 0 }
    }
    bookingsBySource[source].count++
    bookingsBySource[source].revenue += Number(b.total_price || 0)
  })

  // By Check-in Date
  const byCheckIn: Record<string, { total: number; confirmed: number; cancelled: number; revenue: number }> = {}
  // By Check-out Date
  const byCheckOut: Record<string, { bookings: number; revenue: number }> = {}
  // By Booking Date
  const byBookingDate: Record<string, { total: number; confirmed: number; cancelled: number; revenue: number }> = {}

  allBookings?.forEach((b: any) => {
    const checkInMonth = b.check_in_date?.substring(0, 7) // YYYY-MM
    const checkOutMonth = b.check_out_date?.substring(0, 7)
    const bookingMonth = b.booking_date?.substring(0, 7)
    const price = Number(b.total_price || 0)
    const isConfirmed = b.status === "confirmed"

    // By Check-in
    if (checkInMonth) {
      if (!byCheckIn[checkInMonth]) {
        byCheckIn[checkInMonth] = { total: 0, confirmed: 0, cancelled: 0, revenue: 0 }
      }
      byCheckIn[checkInMonth].total++
      if (isConfirmed) {
        byCheckIn[checkInMonth].confirmed++
        byCheckIn[checkInMonth].revenue += price
      } else {
        byCheckIn[checkInMonth].cancelled++
      }
    }

    // By Check-out (confirmed only)
    if (checkOutMonth && isConfirmed) {
      if (!byCheckOut[checkOutMonth]) {
        byCheckOut[checkOutMonth] = { bookings: 0, revenue: 0 }
      }
      byCheckOut[checkOutMonth].bookings++
      byCheckOut[checkOutMonth].revenue += price
    }

    // By Booking Date
    if (bookingMonth) {
      if (!byBookingDate[bookingMonth]) {
        byBookingDate[bookingMonth] = { total: 0, confirmed: 0, cancelled: 0, revenue: 0 }
      }
      byBookingDate[bookingMonth].total++
      if (isConfirmed) {
        byBookingDate[bookingMonth].confirmed++
        byBookingDate[bookingMonth].revenue += price
      } else {
        byBookingDate[bookingMonth].cancelled++
      }
    }
  })

  // Sort months
  const sortedCheckInMonths = Object.keys(byCheckIn).sort()
  const sortedCheckOutMonths = Object.keys(byCheckOut).sort()
  const sortedBookingMonths = Object.keys(byBookingDate).sort()

  // Helper function to format month
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1)
    return date.toLocaleString("he-IL", { month: "short", year: "numeric" })
  }

  // Calculate statistics
  const totalHotels = hotels?.length || 0
  const activeRules = autopilotRules?.length || 0
  const unreadAlerts = alerts?.length || 0
  const totalCompetitors = competitors?.length || 0

  const avgOurPrice =
    dailyPrices && dailyPrices.length > 0
      ? dailyPrices.reduce((sum: number, d: any) => sum + Number(d.our_price || 0), 0) /
        dailyPrices.filter((d: any) => d.our_price).length
      : avgNightlyRate // Fallback to booking ADR

  const avgCompetitorPrice =
    dailyPrices && dailyPrices.length > 0
      ? dailyPrices.reduce((sum: number, d: any) => sum + Number(d.avg_competitor_price || 0), 0) /
        dailyPrices.filter((d: any) => d.avg_competitor_price).length
      : 0

  const avgMarketPrice =
    avgCompetitorPrice ||
    (scanResults && scanResults.length > 0
      ? scanResults.reduce((sum: number, r: any) => sum + Number(r.price), 0) / scanResults.length
      : 0)

  const currentBudget = budgets && budgets.length > 0 ? budgets[0] : null
  const targetRevenue = currentBudget?.target_revenue || 0
  const targetOccupancy = currentBudget?.target_occupancy || 0
  const targetADR = currentBudget?.target_adr || 0

  // Calculate actual revenue this month from bookings
  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const monthEnd = new Date(currentYear, currentMonth, 0)
  const actualRevenue =
    allBookings?.reduce((sum: number, b: any) => {
      const checkIn = new Date(b.check_in_date)
      if (checkIn >= monthStart && checkIn <= monthEnd && b.status === "confirmed") {
        return sum + Number(b.total_price || 0)
      }
      return sum
    }, 0) || 0

  const budgetProgress = targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0
  const budgetGap = targetRevenue - actualRevenue

  // Occupancy calculation based on bookings
  const hotel = hotels?.[0]
  const totalRooms = hotel?.total_rooms || 50
  const daysInMonth = monthEnd.getDate()
  const totalRoomNights = totalRooms * daysInMonth

  const bookedNightsThisMonth =
    allBookings?.reduce((sum: number, b: any) => {
      const checkIn = new Date(b.check_in_date)
      const checkOut = new Date(b.check_out_date)
      if (b.status === "confirmed") {
        // Calculate overlap with current month
        const overlapStart = checkIn < monthStart ? monthStart : checkIn
        const overlapEnd = checkOut > monthEnd ? monthEnd : checkOut
        const nights = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24))
        return sum + (nights > 0 ? nights : 0)
      }
      return sum
    }, 0) || 0

  const avgOccupancy = totalRoomNights > 0 ? (bookedNightsThisMonth / totalRoomNights) * 100 : 0

  // Price trend from daily_prices
  const priceTrend =
    avgOurPrice > 0 && avgCompetitorPrice > 0 ? ((avgOurPrice - avgCompetitorPrice) / avgCompetitorPrice) * 100 : 0

  // Days scanned
  const daysWithData = dailyPrices?.length || 0

  // Last scan time
  const lastScan =
    dailyPrices && dailyPrices.length > 0 ? new Date(dailyPrices[0].updated_at || dailyPrices[0].created_at) : null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20">
              <GaugeIcon className="h-6 w-6 text-cyan-400" />
            </div>
            <h1 className="text-4xl font-bold text-white">Command Center</h1>
          </div>
          <p className="text-slate-400">Real-time revenue intelligence and autopilot status</p>
        </div>
        <div className="flex gap-3">
          <Link href="/calendar">
            <Button
              variant="outline"
              className="gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 bg-transparent"
            >
              <CalendarIcon className="h-4 w-4" />
              Price Calendar
            </Button>
          </Link>
          <Link href="/predictions">
            <Button className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
              <BrainIcon className="h-4 w-4" />
              Generate Predictions
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-8 bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-blue-500/10 border-green-500/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-sm text-slate-400">Total Revenue</div>
                <div className="text-2xl font-bold text-green-400">₪{totalRevenue.toLocaleString()}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <div className="text-sm text-slate-400">Total Bookings</div>
                <div className="text-2xl font-bold text-white">{totalBookings}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <div className="text-sm text-slate-400">Avg per Booking</div>
                <div className="text-2xl font-bold text-cyan-400">₪{avgBookingValue.toFixed(0)}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <div className="text-sm text-slate-400">ADR (Avg/Night)</div>
                <div className="text-2xl font-bold text-purple-400">₪{avgNightlyRate.toFixed(0)}</div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <div className="text-sm text-slate-400">Cancel Rate</div>
                <div className={`text-2xl font-bold ${cancelRate > 20 ? "text-red-400" : "text-yellow-400"}`}>
                  {cancelRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Autopilot Status Banner */}
      <Card className="mb-8 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-cyan-500/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-400 font-medium">Autopilot Active</span>
              </div>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-slate-400">{activeRules} rules running</span>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-slate-400">{daysWithData} days scanned</span>
              <div className="h-4 w-px bg-slate-700" />
              <span className="text-slate-400">{totalCompetitors} competitors tracked</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <ClockIcon className="h-4 w-4" />
              <span className="text-sm">Last scan: {lastScan ? lastScan.toLocaleString() : "Never"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-white">
            <TargetIcon className="h-5 w-5 text-cyan-400" />
            Budget Progress -{" "}
            {new Date(currentYear, currentMonth - 1).toLocaleString("default", { month: "long", year: "numeric" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-6">
            <div>
              <div className="text-sm text-slate-400 mb-1">Target Revenue</div>
              <div className="text-2xl font-bold text-white">
                {targetRevenue > 0 ? `₪${targetRevenue.toLocaleString()}` : "Not Set"}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Booked Revenue</div>
              <div className="text-2xl font-bold text-green-400">₪{actualRevenue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Gap to Target</div>
              <div className={`text-2xl font-bold ${budgetGap > 0 ? "text-red-400" : "text-green-400"}`}>
                {targetRevenue > 0 ? (budgetGap > 0 ? "-" : "+") + "₪" + Math.abs(budgetGap).toLocaleString() : "N/A"}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Occupancy</div>
              <div className="text-2xl font-bold text-cyan-400">{avgOccupancy.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">Future Bookings</div>
              <div className="text-2xl font-bold text-purple-400">{futureBookingsCount}</div>
              <div className="text-xs text-slate-500">₪{futureRevenue.toLocaleString()}</div>
            </div>
          </div>
          {targetRevenue > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">Monthly Progress</span>
                <span className="text-slate-400">{budgetProgress.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    budgetProgress >= 100
                      ? "bg-green-500"
                      : budgetProgress >= 75
                        ? "bg-cyan-500"
                        : budgetProgress >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard
          icon={<BuildingIcon className="h-4 w-4" />}
          label="Properties"
          value={totalHotels.toString()}
          color="cyan"
        />
        <MetricCard
          icon={<CalendarDaysIcon className="h-4 w-4" />}
          label="Confirmed"
          value={confirmedCount.toString()}
          subtext={`of ${totalBookings}`}
          color="green"
        />
        <MetricCard
          icon={<DollarSignIcon className="h-4 w-4" />}
          label="ADR"
          value={`₪${avgNightlyRate.toFixed(0)}`}
          color="purple"
        />
        <MetricCard
          icon={<ZapIcon className="h-4 w-4" />}
          label="Active Rules"
          value={activeRules.toString()}
          color="yellow"
        />
        <MetricCard
          icon={<BarChartIcon className="h-4 w-4" />}
          label="Occupancy"
          value={`${avgOccupancy.toFixed(0)}%`}
          color="blue"
        />
        <MetricCard
          icon={<AlertTriangleIcon className="h-4 w-4" />}
          label="Alerts"
          value={unreadAlerts.toString()}
          color={unreadAlerts > 0 ? "red" : "slate"}
          alert={unreadAlerts > 0}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUpIcon className="h-5 w-5 text-green-400" />
              Revenue by Channel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(bookingsBySource)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .slice(0, 6)
                .map(([source, data]) => {
                  const percentage = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
                  return (
                    <div key={source} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">{source}</span>
                        <span className="text-slate-400">
                          {data.count} bookings · ₪{data.revenue.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Price Position vs Competitors */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSignIcon className="h-5 w-5 text-green-400" />
              Price Position vs Competitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {avgOurPrice > 0 && avgCompetitorPrice > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-400">Your Average Price</div>
                    <div className="text-3xl font-bold text-white">${avgOurPrice.toFixed(0)}</div>
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-2xl font-bold ${priceTrend > 0 ? "text-red-400" : priceTrend < 0 ? "text-green-400" : "text-slate-400"}`}
                    >
                      {priceTrend > 0 ? "+" : ""}
                      {priceTrend.toFixed(1)}%
                    </div>
                    <div className="text-sm text-slate-500">vs competitors</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400">Competitor Average</div>
                    <div className="text-3xl font-bold text-slate-300">${avgCompetitorPrice.toFixed(0)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-3xl font-bold text-cyan-400 mb-2">${avgNightlyRate.toFixed(0)}</div>
                <div className="text-slate-400">Your ADR (Average Daily Rate)</div>
                <div className="text-sm text-slate-500 mt-2">Run a competitor scan to compare prices</div>
                <Link href="/calendar">
                  <Button size="sm" className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500">
                    Run Scan
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="h-6 w-6 text-cyan-400" />
          פירוט חודשי - Monthly Breakdown
        </h2>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* By Check-in Date */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <ArrowRightIcon className="h-4 w-4 text-green-400" />
                לפי תאריך כניסה (Check-in)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sortedCheckInMonths.map((month) => {
                  const data = byCheckIn[month]
                  return (
                    <div
                      key={month}
                      className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-white">{formatMonth(month)}</div>
                        <div className="text-xs text-slate-400">
                          {data.confirmed} מאושרות · {data.cancelled} ביטולים
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-400">${data.revenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{data.total} הזמנות</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* By Check-out Date */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <ArrowLeftIcon className="h-4 w-4 text-blue-400" />
                לפי תאריך יציאה (Check-out)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sortedCheckOutMonths.map((month) => {
                  const data = byCheckOut[month]
                  return (
                    <div
                      key={month}
                      className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-white">{formatMonth(month)}</div>
                        <div className="text-xs text-slate-400">מאושרות בלבד</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-400">${data.revenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{data.bookings} הזמנות</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* By Booking Date */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-white text-lg">
                <CalendarIcon className="h-4 w-4 text-purple-400" />
                לפי תאריך הזמנה (Booking Date)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sortedBookingMonths.map((month) => {
                  const data = byBookingDate[month]
                  return (
                    <div
                      key={month}
                      className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-white">{formatMonth(month)}</div>
                        <div className="text-xs text-slate-400">
                          {data.confirmed} מאושרות · {data.cancelled} ביטולים
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-400">${data.revenue.toLocaleString()}</div>
                        <div className="text-xs text-slate-500">{data.total} הזמנות</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts */}
      <DashboardCharts
        scanResults={scanResults || []}
        predictions={predictions || []}
        revenue={revenue || []}
        dailyPrices={dailyPrices || []}
      />

      {/* Bottom Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        {/* Autopilot Activity */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ZapIcon className="h-5 w-5 text-yellow-400" />
              Autopilot Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!autopilotLogs || autopilotLogs.length === 0 ? (
              <div className="text-center py-8">
                <BotIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No actions yet</p>
                <Link href="/autopilot/new">
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                    Create First Rule
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {autopilotLogs.slice(0, 5).map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="h-4 w-4 text-green-400" />
                      <div>
                        <div className="font-medium text-sm text-white">{log.action_taken}</div>
                        <div className="text-xs text-slate-500">{new Date(log.executed_at).toLocaleString()}</div>
                      </div>
                    </div>
                    {log.old_price && log.new_price && (
                      <div className="text-right">
                        <span className="text-slate-500">${log.old_price}</span>
                        <span className="mx-1 text-slate-600">→</span>
                        <span className="font-bold text-green-400">${log.new_price}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming High Demand Days */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUpIcon className="h-5 w-5 text-green-400" />
              High Demand Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyPrices &&
            dailyPrices.filter((d: any) => d.demand_level === "high" || d.demand_level === "peak").length > 0 ? (
              <div className="space-y-3">
                {dailyPrices
                  .filter((d: any) => d.demand_level === "high" || d.demand_level === "peak")
                  .slice(0, 5)
                  .map((day: any) => (
                    <div
                      key={day.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                    >
                      <div>
                        <div className="font-medium text-sm text-white">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <Badge className={day.demand_level === "peak" ? "bg-red-500" : "bg-orange-500"}>
                          {day.demand_level} demand
                        </Badge>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">${day.our_price || day.recommended_price}</div>
                        <div className="text-xs text-slate-500">rec: ${day.recommended_price}</div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No high demand days detected</p>
                <Link href="/calendar">
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 bg-transparent">
                    View Calendar
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competitors Summary */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UsersIcon className="h-5 w-5 text-purple-400" />
              Competitors Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            {competitors && competitors.length > 0 ? (
              <div className="space-y-3">
                {competitors.slice(0, 5).map((comp: any) => {
                  const compPrices = competitorPrices?.filter((p: any) => p.competitor_id === comp.id) || []
                  const avgPrice =
                    compPrices.length > 0
                      ? compPrices.reduce((s: number, p: any) => s + Number(p.price), 0) / compPrices.length
                      : 0
                  return (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                    >
                      <div>
                        <div className="font-medium text-sm text-white">{comp.competitor_hotel_name}</div>
                        <div className="text-xs text-slate-500">
                          {"⭐".repeat(comp.star_rating || 0)} {comp.star_rating ? `${comp.star_rating} stars` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        {avgPrice > 0 ? (
                          <>
                            <div className="text-lg font-bold text-white">${avgPrice.toFixed(0)}</div>
                            <div className="text-xs text-slate-500">avg price</div>
                          </>
                        ) : (
                          <span className="text-slate-500 text-sm">No data</span>
                        )}
                      </div>
                    </div>
                  )
                })}
                <Link href="/competitors">
                  <Button size="sm" variant="outline" className="w-full border-slate-700 text-slate-300 bg-transparent">
                    Manage Competitors
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <UsersIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">No competitors configured</p>
                <Link href="/competitors/add">
                  <Button size="sm" className="bg-gradient-to-r from-cyan-500 to-blue-500">
                    Add Competitors
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
  trend,
  color,
  alert,
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  trend?: number
  color: string
  alert?: boolean
}) {
  const colorClasses: Record<string, string> = {
    cyan: "from-cyan-500/20 to-cyan-500/10 border-cyan-500/30 text-cyan-400",
    green: "from-green-500/20 to-green-500/10 border-green-500/30 text-green-400",
    yellow: "from-yellow-500/20 to-yellow-500/10 border-yellow-500/30 text-yellow-400",
    purple: "from-purple-500/20 to-purple-500/10 border-purple-500/30 text-purple-400",
    blue: "from-blue-500/20 to-blue-500/10 border-blue-500/30 text-blue-400",
    red: "from-red-500/20 to-red-500/10 border-red-500/30 text-red-400",
    slate: "from-slate-500/20 to-slate-500/10 border-slate-500/30 text-slate-400",
  }

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]} border relative overflow-hidden`}>
      {alert && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">{icon}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtext && <div className="text-xs text-slate-500">{subtext}</div>}
        <div className="text-xs text-slate-500 mt-1">{label}</div>
        {trend !== undefined && (
          <div
            className={`text-xs mt-1 ${trend > 0 ? "text-green-400" : trend < 0 ? "text-red-400" : "text-slate-500"}`}
          >
            {trend > 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </div>
        )}
      </CardContent>
    </Card>
  )
}
