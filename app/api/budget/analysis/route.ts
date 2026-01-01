import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hotelId = searchParams.get('hotelId')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString())

    if (!hotelId) {
      return NextResponse.json({ error: 'hotelId required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get hotel info
    const { data: hotel } = await supabase
      .from('hotels')
      .select('id, name, total_rooms, base_price')
      .eq('id', hotelId)
      .single()

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
    }

    // Get budget target
    const { data: budget } = await supabase
      .from('revenue_budgets')
      .select('*')
      .eq('hotel_id', hotelId)
      .eq('year', year)
      .eq('month', month)
      .single()

    const targetRevenue = budget?.target_revenue || 0

    if (targetRevenue === 0) {
      return NextResponse.json({ 
        error: 'No budget target set for this period',
        hotelId,
        hotelName: hotel.name,
        targetRevenue: 0
      }, { status: 200 })
    }

    // Calculate date ranges
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)
    const today = new Date()
    const daysInMonth = monthEnd.getDate()
    const daysElapsed = today.getDate() > daysInMonth ? daysInMonth : today.getDate()
    const daysRemaining = Math.max(0, daysInMonth - daysElapsed + 1)

    // Get actual revenue (past bookings)
    const { data: revenueTracking } = await supabase
      .from('revenue_tracking')
      .select('revenue')
      .eq('hotel_id', hotelId)
      .gte('date', monthStart.toISOString().split('T')[0])
      .lte('date', monthEnd.toISOString().split('T')[0])

    const actualRevenue = revenueTracking?.reduce((sum, r) => sum + Number(r.revenue || 0), 0) || 0

    // Get booked revenue (future confirmed bookings in this month)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('check_in_date, check_out_date, total_price, room_count')
      .eq('hotel_id', hotelId)
      .eq('status', 'confirmed')
      .gte('check_in_date', monthStart.toISOString().split('T')[0])
      .lte('check_in_date', monthEnd.toISOString().split('T')[0])

    let bookedRevenue = 0
    const now = new Date()

    bookings?.forEach((booking) => {
      const checkIn = new Date(booking.check_in_date)
      const checkOut = new Date(booking.check_out_date)
      
      // Only count future bookings
      if (checkIn > now) {
        // Calculate how many nights are in this month
        const effectiveStart = checkIn > monthStart ? checkIn : monthStart
        const effectiveEnd = checkOut < monthEnd ? checkOut : monthEnd
        
        const totalNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
        const nightsInMonth = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24))
        
        if (nightsInMonth > 0 && totalNights > 0) {
          const revenueForMonth = (Number(booking.total_price) / totalNights) * nightsInMonth
          bookedRevenue += revenueForMonth
        }
      }
    })

    // Calculate metrics
    const totalExpectedRevenue = actualRevenue + bookedRevenue
    const budgetGap = targetRevenue - totalExpectedRevenue
    const budgetGapPercent = (budgetGap / targetRevenue) * 100

    const dailyRevenueNeeded = daysRemaining > 0 ? budgetGap / daysRemaining : 0
    const dailyRevenueActual = daysElapsed > 0 ? actualRevenue / daysElapsed : 0

    // Calculate bookings needed
    const avgRoomPrice = hotel.base_price || 500
    const bookingsNeeded = Math.ceil(budgetGap / avgRoomPrice)
    const avgPriceNeeded = budgetGap > 0 ? budgetGap / (daysRemaining * (hotel.total_rooms || 50) * 0.3) : 0

    // Get current occupancy
    const { data: recentDays } = await supabase
      .from('revenue_tracking')
      .select('occupancy_rate')
      .eq('hotel_id', hotelId)
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false })
      .limit(7)

    const currentOccupancy = recentDays && recentDays.length > 0
      ? recentDays.reduce((sum, d) => sum + Number(d.occupancy_rate || 0), 0) / recentDays.length
      : 65

    // Determine performance status
    let performanceStatus: 'excellent' | 'good' | 'warning' | 'critical'
    if (budgetGapPercent <= -5) {
      performanceStatus = 'excellent'
    } else if (budgetGapPercent <= 5) {
      performanceStatus = 'good'
    } else if (budgetGapPercent <= 15) {
      performanceStatus = 'warning'
    } else {
      performanceStatus = 'critical'
    }

    // Generate recommendation
    let recommendation = ''
    if (budgetGap <= 0) {
      recommendation = `מעולה! עברת את יעד התקציב ב-₪${Math.abs(budgetGap).toLocaleString()}. המשך לשמור על רמת המחירים הנוכחית.`
    } else if (daysRemaining === 0) {
      recommendation = `החודש הסתיים. חסרים ₪${budgetGap.toLocaleString()} ליעד (${budgetGapPercent.toFixed(1)}%). נתח את הנתונים לשיפור בחודש הבא.`
    } else if (performanceStatus === 'critical') {
      const priceIncrease = ((avgPriceNeeded / avgRoomPrice) - 1) * 100
      recommendation = `מצב קריטי! נדרש ${bookingsNeeded} הזמנות נוספות ב-${daysRemaining} ימים. המלצה: העלה מחירים ב-${priceIncrease.toFixed(0)}% או הפעל מבצעי מכירה אגרסיביים.`
    } else if (performanceStatus === 'warning') {
      recommendation = `נדרש דחיפה אחרונה - ${bookingsNeeded} הזמנות ב-${daysRemaining} ימים (₪${Math.round(dailyRevenueNeeded).toLocaleString()}/יום). שקול מבצעים ממוקדים או העלאת מחירים קלה.`
    } else {
      recommendation = `בקצב טוב! נדרש לסגור ${bookingsNeeded} הזמנות נוספות ב-${daysRemaining} ימים. המשך בקצב הנוכחי והכל יהיה בסדר.`
    }

    return NextResponse.json({
      hotelId: hotel.id,
      hotelName: hotel.name,
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
      recommendation,
      totalRooms: hotel.total_rooms || 50,
      currentOccupancy,
      avgRoomPrice
    })

  } catch (error) {
    console.error('[Budget Analysis API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
