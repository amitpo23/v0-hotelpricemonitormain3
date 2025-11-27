import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const today = new Date().toISOString().split("T")[0]

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .gte("check_in_date", today)
    .eq("status", "confirmed")
    .order("check_in_date", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ bookings })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { error } = await supabase.from("bookings").insert({
    hotel_id: body.hotel_id,
    check_in_date: body.check_in_date,
    check_out_date: body.check_out_date,
    room_type: body.room_type,
    room_count: body.room_count,
    total_price: body.total_price,
    nightly_rate: body.nightly_rate,
    guest_name: body.guest_name,
    booking_source: body.booking_source,
    status: "confirmed",
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
