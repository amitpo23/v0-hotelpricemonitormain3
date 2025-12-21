import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    console.log('Apify webhook received:', payload)

    const { datasetId, status, actorRunId } = payload

    // Skip non-successful runs
    if (status !== 'SUCCEEDED') {
      return NextResponse.json(
        { message: 'Skipping non-successful run', status },
        { status: 200 }
      )
    }

    // Fetch data from Apify dataset
    const APIFY_TOKEN = process.env.APIFY_TOKEN
    if (!APIFY_TOKEN) {
      throw new Error('APIFY_TOKEN not configured')
    }

    const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`
    console.log('Fetching from Apify dataset...')
    
    const response = await fetch(datasetUrl)
    const hotels = await response.json()
    
    console.log(`Received ${hotels.length} hotels from Apify`)

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Transform and insert data
    const priceRecords = hotels.slice(0, 10).map((hotel: any) => ({
      hotel_id: null,
      user_id: null,
      check_in_date: new Date().toISOString().split('T')[0],
      room_type: hotel.name || 'Unknown',
      current_price: parseFloat(hotel.price?.replace(/[^0-9.]/g, '') || '0'),
      competitor_prices: JSON.stringify(hotel),
      changed_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('price_history')
      .insert(priceRecords)

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    console.log(`Successfully inserted ${priceRecords.length} records`)

    return NextResponse.json({
      success: true,
      message: `Processed ${hotels.length} hotels`,
      inserted: priceRecords.length,
      actorRunId,
    })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: '/api/webhooks/apify' })
}
