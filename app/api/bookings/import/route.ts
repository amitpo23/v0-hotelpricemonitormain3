import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { hotelId, bookings, analytics } = await request.json()

    if (!hotelId || !bookings || !Array.isArray(bookings)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const bookingsToInsert = bookings.map((booking) => ({
      hotel_id: hotelId,
      guest_name: booking.guest_name || "Guest",
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      room_type: booking.room_type || "Standard",
      room_number: booking.room_number || null,
      room_count: booking.room_count || 1,
      nights: booking.nights || 1,
      nightly_rate: booking.nightly_rate || 0,
      total_price: booking.total_price || 0,
      booking_source: booking.booking_source || "PMS Import",
      status: booking.status || "confirmed",
      booking_date: booking.booking_date || new Date().toISOString().split("T")[0],
    }))

    // Insert in batches of 100
    let imported = 0
    const batchSize = 100

    for (let i = 0; i < bookingsToInsert.length; i += batchSize) {
      const batch = bookingsToInsert.slice(i, i + batchSize)

      const { data, error } = await supabase.from("bookings").insert(batch).select()

      if (error) {
        console.error("Error inserting batch:", error)
      } else {
        imported += data?.length || 0
      }
    }

    if (analytics && analytics.occupancyByMonth) {
      const occupancyRecords = Object.entries(analytics.occupancyByMonth).map(([month, data]: [string, any]) => ({
        hotel_id: hotelId,
        month: month,
        room_nights: data.roomNights,
        revenue: data.revenue,
        bookings_count: data.bookings,
        avg_daily_rate: data.revenue / data.roomNights || 0,
        source: "pms_import",
        created_at: new Date().toISOString(),
      }))

      // Upsert occupancy data
      for (const record of occupancyRecords) {
        await supabase.from("monthly_occupancy").upsert(record, { onConflict: "hotel_id,month" }).select()
      }
    }

    await supabase
      .from("hotels")
      .update({
        last_pms_import: new Date().toISOString(),
        pms_bookings_count: imported,
      })
      .eq("id", hotelId)

    return NextResponse.json({
      success: true,
      imported,
      total: bookings.length,
      analytics: analytics
        ? {
            totalRevenue: analytics.totalRevenue,
            totalRoomNights: analytics.totalRoomNights,
            avgNightlyRate: analytics.avgNightlyRate,
          }
        : null,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Failed to import bookings" }, { status: 500 })
  }
}
