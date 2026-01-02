import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const limit = parseInt(searchParams.get('limit') || '10')

    const supabase = await createClient()

    let query = supabase
      .from('prediction_generation_logs')
      .select('*')
      .order('started_at', { ascending: false })

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    } else {
      query = query.limit(limit)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching generation logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      logs: logs || []
    })
  } catch (error) {
    console.error('Error in generation logs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
