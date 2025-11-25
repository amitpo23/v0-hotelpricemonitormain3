import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("scan_configs")
    .select(`*, hotels (name)`)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from("scan_configs")
    .insert({
      hotel_id: body.hotel_id,
      check_in_date: body.check_in_date,
      check_out_date: body.check_out_date,
      room_type: body.room_type,
      guests: body.guests,
      frequency: body.frequency,
      is_active: body.is_active,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
