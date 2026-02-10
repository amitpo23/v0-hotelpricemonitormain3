import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod/v4"
import { logger } from "@/lib/logger"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY)
}

const bookingItemSchema = z.object({
  guest_name: z.string().optional(),
  check_in_date: z.string(),
  check_out_date: z.string(),
  room_type: z.string().optional(),
  room_number: z.string().nullable().optional(),
  room_count: z.number().optional(),
  nights: z.number().optional(),
  nightly_rate: z.number().optional(),
  total_price: z.number().optional(),
  booking_source: z.string().optional(),
  status: z.string().optional(),
  booking_date: z.string().optional(),
})

const importSchema = z.object({
  hotelId: z.string().uuid("Invalid hotel ID format"),
  bookings: z.array(bookingItemSchema).min(1, "At least one booking is required"),
  analytics: z.object({
    occupancyByMonth: z.record(z.string(), z.object({
      roomNights: z.number(),
      revenue: z.number(),
      bookings: z.number(),
    })).optional(),
    totalRevenue: z.number().optional(),
    totalRoomNights: z.number().optional(),
    avgNightlyRate: z.number().optional(),
  }).nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase()
    const body = await request.json()

    const parsed = importSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      )
    }

    const { hotelId, bookings, analytics } = parsed.data

    const bookingsToInsert = bookings.map((booking: Record<string, unknown>) => ({
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
        logger.error("Error inserting batch", error instanceof Error ? error : new Error(String(error)))
      } else {
        imported += data?.length || 0
      }
    }

    if (analytics && analytics.occupancyByMonth) {
      const occupancyRecords = Object.entries(analytics.occupancyByMonth).map(([month, data]: [string, Record<string, number>]) => ({
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
    logger.error("Import error", error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: "Failed to import bookings" }, { status: 500 })
  }
}
