import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CalendarDaysIcon,
  DollarSignIcon,
  TrendingUpIcon,
  UsersIcon,
  Building2Icon,
  PlusIcon,
  XCircleIcon,
  CheckCircleIcon,
  PercentIcon,
} from "@/components/icons"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ExcelUpload } from "./excel-upload"

export default async function BookingsPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]
  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const monthStart = new Date(currentYear, currentMonth - 1, 1)
  const monthEnd = new Date(currentYear, currentMonth, 0)

  const { data: hotels } = await supabase.from("hotels").select("*")

  const { data: allBookings } = await supabase.from("bookings").select("*").order("check_in_date", { ascending: true })

  const { data: futureBookings } = await supabase
    .from("bookings")
    .select("*")
    .gte("check_in_date", today)
    .eq("status", "confirmed")
    .order("check_in_date", { ascending: true })

  const totalBookings = allBookings?.length || 0
  const confirmedBookings = allBookings?.filter((b) => b.status === "confirmed") || []
  const cancelledBookings = allBookings?.filter((b) => b.status === "cancelled") || []
  const cancelRate = totalBookings > 0 ? (cancelledBookings.length / totalBookings) * 100 : 0

  const totalRevenue = allBookings?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0
  const confirmedRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

  const totalNights =
    allBookings?.reduce((sum, b) => {
      const checkIn = new Date(b.check_in_date)
      const checkOut = new Date(b.check_out_date)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      return sum + (nights > 0 ? nights : 0)
    }, 0) || 0
  const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0

  // Future bookings stats
  const futureBookingsCount = futureBookings?.length || 0
  const futureRevenue = futureBookings?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0

  const revenueBySource: Record<string, { count: number; revenue: number; avgValue: number }> = {}
  allBookings?.forEach((b) => {
    const source = b.booking_source || "Direct"
    if (!revenueBySource[source]) {
      revenueBySource[source] = { count: 0, revenue: 0, avgValue: 0 }
    }
    revenueBySource[source].count++
    revenueBySource[source].revenue += Number(b.total_price || 0)
  })
  Object.keys(revenueBySource).forEach((source) => {
    revenueBySource[source].avgValue = revenueBySource[source].revenue / revenueBySource[source].count
  })

  // This month stats
  const thisMonthBookings =
    allBookings?.filter((b) => {
      const checkIn = new Date(b.check_in_date)
      return checkIn >= monthStart && checkIn <= monthEnd
    }) || []
  const thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)

  const bookingsByHotel: Record<string, any[]> = {}
  futureBookings?.forEach((b) => {
    if (!bookingsByHotel[b.hotel_id]) {
      bookingsByHotel[b.hotel_id] = []
    }
    bookingsByHotel[b.hotel_id].push(b)
  })

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bookings Backlog</h1>
          <p className="text-muted-foreground">צבר הזמנות עתידיות - משפיע על תחזיות המחירים</p>
        </div>
        <div className="flex items-center gap-3">
          <ExcelUpload hotels={hotels || []} />
          <Link href="/bookings/add">
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Booking
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Bookings</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Confirmed</p>
                <p className="text-2xl font-bold text-green-400">{confirmedBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <XCircleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Cancelled</p>
                <p className="text-2xl font-bold text-red-400">{cancelledBookings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <PercentIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Cancel Rate</p>
                <p className={`text-2xl font-bold ${cancelRate > 20 ? "text-red-400" : "text-yellow-400"}`}>
                  {cancelRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSignIcon className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">₪{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUpIcon className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Nights</p>
                <p className="text-2xl font-bold">{totalNights.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <UsersIcon className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">ADR</p>
                <p className="text-2xl font-bold">₪{avgNightlyRate.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Avg Booking</p>
                <p className="text-2xl font-bold">₪{avgBookingValue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUpIcon className="h-5 w-5 text-green-400" />
            Revenue by Channel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(revenueBySource)
              .sort((a, b) => b[1].revenue - a[1].revenue)
              .slice(0, 6)
              .map(([source, data]) => {
                const percentage = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
                return (
                  <div key={source} className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-white">{source}</span>
                      <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-green-400">₪{data.revenue.toLocaleString()}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      {data.count} bookings · Avg ₪{data.avgValue.toFixed(0)}
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mt-2">
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

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border-green-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <DollarSignIcon className="h-8 w-8 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">This Month Revenue</p>
                <p className="text-3xl font-bold text-green-400">₪{thisMonthRevenue.toLocaleString()}</p>
                <p className="text-sm text-slate-500">{thisMonthBookings.length} bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <CalendarDaysIcon className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Future Bookings</p>
                <p className="text-3xl font-bold text-blue-400">{futureBookingsCount}</p>
                <p className="text-sm text-slate-500">₪{futureRevenue.toLocaleString()} booked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUpIcon className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-400">How Bookings Affect Predictions</p>
              <p className="text-sm text-slate-400 mt-1">צבר ההזמנות משפיע על תחזיות המחירים בצורה הבאה:</p>
              <ul className="text-sm text-slate-400 mt-2 space-y-1 list-disc list-inside">
                <li>תפוסה גבוהה (מעל 60%) = המלצה להעלות מחיר</li>
                <li>תפוסה נמוכה (מתחת ל-20%) = המלצה להוריד מחיר</li>
                <li>פער מתקציב = לחץ להתאים מחירים להשגת היעד</li>
                <li>הכנסה מוזמנת נספרת כחלק מהתקדמות לתקציב</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hotels with bookings */}
      {hotels?.map((hotel) => {
        const hotelBookings = bookingsByHotel[hotel.id] || []
        const hotelRevenue = hotelBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)

        return (
          <Card key={hotel.id} className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2Icon className="h-5 w-5 text-cyan-400" />
                  <CardTitle>{hotel.name}</CardTitle>
                  <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
                    {hotelBookings.length} upcoming
                  </Badge>
                </div>
                <span className="text-green-400 font-semibold">₪{hotelRevenue.toLocaleString()} booked</span>
              </div>
            </CardHeader>
            <CardContent>
              {hotelBookings.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No upcoming bookings</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-slate-400 text-sm border-b border-slate-800">
                        <th className="pb-2">Guest</th>
                        <th className="pb-2">Check-in</th>
                        <th className="pb-2">Check-out</th>
                        <th className="pb-2">Nights</th>
                        <th className="pb-2">Source</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {hotelBookings.slice(0, 10).map((booking) => {
                        const checkIn = new Date(booking.check_in_date)
                        const checkOut = new Date(booking.check_out_date)
                        const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

                        return (
                          <tr key={booking.id} className="border-b border-slate-800/50">
                            <td className="py-2 text-white">{booking.guest_name || "Guest"}</td>
                            <td className="py-2">{checkIn.toLocaleDateString()}</td>
                            <td className="py-2">{checkOut.toLocaleDateString()}</td>
                            <td className="py-2">{nights}</td>
                            <td className="py-2">
                              <Badge variant="secondary" className="text-xs">
                                {booking.booking_source || "Direct"}
                              </Badge>
                            </td>
                            <td className="py-2 text-right font-medium text-green-400">
                              ₪{Number(booking.total_price || 0).toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {hotelBookings.length > 10 && (
                    <p className="text-slate-500 text-sm text-center mt-3">
                      +{hotelBookings.length - 10} more bookings
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {(!hotels || hotels.length === 0) && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-8 text-center">
            <Building2Icon className="h-12 w-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No hotels found. Add a hotel first.</p>
            <Link href="/hotels">
              <Button className="mt-4">Go to Properties</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
