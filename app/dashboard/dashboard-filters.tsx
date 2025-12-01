"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, FilterIcon, TrendingUpIcon, UsersIcon, ArrowRightIcon, XIcon } from "@/components/icons"

type DateFilterType = "all" | "booking_date" | "check_in" | "check_out"

interface Booking {
  id: string
  guest_name: string
  check_in_date: string
  check_out_date: string
  booking_date: string
  total_price: number
  status: string
  booking_source: string
}

interface DashboardFiltersProps {
  allBookings: Booking[]
}

export function DashboardFilters({ allBookings }: DashboardFiltersProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [dateFilterType, setDateFilterType] = useState<DateFilterType>("all")

  // Get available months from bookings
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    allBookings.forEach((b) => {
      if (b.check_in_date) months.add(b.check_in_date.substring(0, 7))
      if (b.check_out_date) months.add(b.check_out_date.substring(0, 7))
      if (b.booking_date) months.add(b.booking_date.substring(0, 7))
    })
    return Array.from(months).sort()
  }, [allBookings])

  // Filter bookings based on selection
  const filteredBookings = useMemo(() => {
    if (selectedMonth === "all" && dateFilterType === "all") {
      return allBookings
    }

    return allBookings.filter((b) => {
      if (selectedMonth === "all") return true

      switch (dateFilterType) {
        case "booking_date":
          return b.booking_date?.startsWith(selectedMonth)
        case "check_in":
          return b.check_in_date?.startsWith(selectedMonth)
        case "check_out":
          return b.check_out_date?.startsWith(selectedMonth)
        default:
          // If no specific filter type, match any date field
          return (
            b.booking_date?.startsWith(selectedMonth) ||
            b.check_in_date?.startsWith(selectedMonth) ||
            b.check_out_date?.startsWith(selectedMonth)
          )
      }
    })
  }, [allBookings, selectedMonth, dateFilterType])

  // Calculate stats from filtered bookings
  const stats = useMemo(() => {
    const total = filteredBookings.length
    const confirmed = filteredBookings.filter((b) => b.status === "confirmed").length
    const cancelled = filteredBookings.filter((b) => b.status === "cancelled").length
    const cancelRate = total > 0 ? (cancelled / total) * 100 : 0

    const totalRevenue = filteredBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)
    const avgBookingValue = total > 0 ? totalRevenue / total : 0

    const totalNights = filteredBookings.reduce((sum, b) => {
      const checkIn = new Date(b.check_in_date)
      const checkOut = new Date(b.check_out_date)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      return sum + (nights > 0 ? nights : 0)
    }, 0)
    const adr = totalNights > 0 ? totalRevenue / totalNights : 0

    // By source
    const bySource: Record<string, { count: number; revenue: number }> = {}
    filteredBookings.forEach((b) => {
      const source = b.booking_source || "Direct"
      if (!bySource[source]) bySource[source] = { count: 0, revenue: 0 }
      bySource[source].count++
      bySource[source].revenue += Number(b.total_price || 0)
    })

    return {
      total,
      confirmed,
      cancelled,
      cancelRate,
      totalRevenue,
      avgBookingValue,
      adr,
      bySource,
    }
  }, [filteredBookings])

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-")
    const monthNames = [
      "ינואר",
      "פברואר",
      "מרץ",
      "אפריל",
      "מאי",
      "יוני",
      "יולי",
      "אוגוסט",
      "ספטמבר",
      "אוקטובר",
      "נובמבר",
      "דצמבר",
    ]
    return `${monthNames[Number.parseInt(month) - 1]} ${year}`
  }

  const dateFilterLabels: Record<DateFilterType, string> = {
    all: "כל התאריכים",
    booking_date: "תאריך הזמנה",
    check_in: "תאריך כניסה",
    check_out: "תאריך יציאה",
  }

  const clearFilters = () => {
    setSelectedMonth("all")
    setDateFilterType("all")
  }

  const hasActiveFilters = selectedMonth !== "all" || dateFilterType !== "all"

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <FilterIcon className="h-5 w-5 text-primary" />
              פילטרים
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <XIcon className="h-4 w-4 mr-1" />
                נקה פילטרים
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Filter Type */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">סנן לפי:</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(dateFilterLabels) as DateFilterType[]).map((type) => (
                <Button
                  key={type}
                  variant={dateFilterType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDateFilterType(type)}
                  className="text-xs"
                >
                  {type === "booking_date" && <CalendarIcon className="h-3 w-3 mr-1" />}
                  {type === "check_in" && <ArrowRightIcon className="h-3 w-3 mr-1" />}
                  {type === "check_out" && <ArrowRightIcon className="h-3 w-3 mr-1 rotate-180" />}
                  {dateFilterLabels[type]}
                </Button>
              ))}
            </div>
          </div>

          {/* Month Selection */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">בחר חודש:</label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedMonth === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMonth("all")}
                className="text-xs"
              >
                כל החודשים
              </Button>
              {availableMonths.map((month) => (
                <Button
                  key={month}
                  variant={selectedMonth === month ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMonth(month)}
                  className="text-xs"
                >
                  {formatMonth(month)}
                </Button>
              ))}
            </div>
          </div>

          {/* Active Filter Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <span className="text-sm text-muted-foreground">מציג:</span>
              {dateFilterType !== "all" && <Badge variant="secondary">{dateFilterLabels[dateFilterType]}</Badge>}
              {selectedMonth !== "all" && <Badge variant="secondary">{formatMonth(selectedMonth)}</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtered Stats */}
      <Card className="border-border/50 bg-gradient-to-br from-primary/10 via-card to-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUpIcon className="h-5 w-5 text-primary" />
            נתונים מסוננים
            {hasActiveFilters && (
              <Badge variant="outline" className="ml-2 text-xs">
                {stats.total} הזמנות
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-primary">
                ₪{stats.totalRevenue.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">סה״כ הכנסות</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-cyan-400">{stats.total}</div>
              <div className="text-xs text-muted-foreground">סה״כ הזמנות</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-green-400">
                ₪{stats.avgBookingValue.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">ממוצע להזמנה</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className="text-2xl font-bold text-blue-400">
                ₪{stats.adr.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">ADR</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/50">
              <div className={`text-2xl font-bold ${stats.cancelRate > 15 ? "text-red-400" : "text-yellow-400"}`}>
                {stats.cancelRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">שיעור ביטולים</div>
            </div>
          </div>

          {/* Revenue by Source */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <UsersIcon className="h-4 w-4" />
              הכנסות לפי ערוץ
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(stats.bySource)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .slice(0, 4)
                .map(([source, data]) => (
                  <div key={source} className="p-2 rounded bg-background/30">
                    <div className="text-xs text-muted-foreground truncate">{source}</div>
                    <div className="text-sm font-bold text-primary">
                      ₪{data.revenue.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground">{data.count} הזמנות</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Confirmed vs Cancelled breakdown */}
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-400">מאושרות</span>
                <span className="text-lg font-bold text-green-400">{stats.confirmed}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {stats.total > 0 ? ((stats.confirmed / stats.total) * 100).toFixed(1) : 0}% מסה״כ
              </div>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-400">ביטולים</span>
                <span className="text-lg font-bold text-red-400">{stats.cancelled}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{stats.cancelRate.toFixed(1)}% מסה״כ</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
