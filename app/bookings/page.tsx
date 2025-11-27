import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, DollarSign, TrendingUp, Users, Building2, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function BookingsPage() {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]

  // Get all hotels
  const { data: hotels } = await supabase.from("hotels").select("*")

  // Get upcoming bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .gte("check_in_date", today)
    .eq("status", "confirmed")
    .order("check_in_date", { ascending: true })

  // Calculate stats
  const totalBookings = bookings?.length || 0
  const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_price || 0), 0) || 0
  const totalNights =
    bookings?.reduce((sum, b) => {
      const checkIn = new Date(b.check_in_date)
      const checkOut = new Date(b.check_out_date)
      return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    }, 0) || 0
  const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0

  // Group bookings by hotel
  const bookingsByHotel: Record<string, any[]> = {}
  bookings?.forEach((b) => {
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
        <Link href="/bookings/add">
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-500">
            <Plus className="h-4 w-4 mr-2" />
            Add Booking
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <CalendarDays className="h-5 w-5 text-cyan-400" />
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
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Booked Revenue</p>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Nights</p>
                <p className="text-2xl font-bold">{totalNights}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Users className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Avg Nightly Rate</p>
                <p className="text-2xl font-bold">${avgNightlyRate.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-blue-400 mt-0.5" />
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

      {/* Bookings by Hotel */}
      {hotels?.map((hotel) => {
        const hotelBookings = bookingsByHotel[hotel.id] || []
        const hotelRevenue = hotelBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0)

        return (
          <Card key={hotel.id} className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-cyan-400" />
                  <CardTitle>{hotel.name}</CardTitle>
                  <Badge variant="outline" className="text-cyan-400 border-cyan-400/50">
                    {hotelBookings.length} bookings
                  </Badge>
                </div>
                <span className="text-green-400 font-semibold">${hotelRevenue.toLocaleString()} booked</span>
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
                        <th className="pb-2">Check-in</th>
                        <th className="pb-2">Check-out</th>
                        <th className="pb-2">Nights</th>
                        <th className="pb-2">Rooms</th>
                        <th className="pb-2">Room Type</th>
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
                            <td className="py-2">{checkIn.toLocaleDateString()}</td>
                            <td className="py-2">{checkOut.toLocaleDateString()}</td>
                            <td className="py-2">{nights}</td>
                            <td className="py-2">{booking.room_count || 1}</td>
                            <td className="py-2">{booking.room_type || "Standard"}</td>
                            <td className="py-2">
                              <Badge variant="secondary" className="text-xs">
                                {booking.booking_source || "Direct"}
                              </Badge>
                            </td>
                            <td className="py-2 text-right font-medium">
                              ${Number(booking.total_price || 0).toLocaleString()}
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
            <Building2 className="h-12 w-12 mx-auto text-slate-600 mb-4" />
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
