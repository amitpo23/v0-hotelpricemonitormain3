import { ApifyClient } from 'apify-client'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

interface SearchParams {
  destination: string
  checkIn: string
  checkOut: string
  rooms?: number
  adults?: number
  children?: number
  maxResults?: number
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    
    // Constant-time auth check to prevent timing attacks
    const expectedToken = process.env.SYNC_SECRET_TOKEN
    if (!token || !expectedToken || token.length !== expectedToken.length) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    try {
      const isValid = timingSafeEqual(
        Buffer.from(token),
        Buffer.from(expectedToken)
      )
      if (!isValid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search parameters from request body
    const body = await request.json()
    const { 
      destination, 
      checkIn, 
      checkOut, 
      rooms = 1,
      adults = 2,
      children = 0,
      maxResults = 10,
      userId 
    }: SearchParams & { userId?: string } = body

    if (!destination || !checkIn || !checkOut) {
      return NextResponse.json({ 
        error: 'Missing required parameters: destination, checkIn, checkOut' 
      }, { status: 400 })
    }

    console.log('Starting Apify scraper with params:', { destination, checkIn, checkOut, rooms, adults, children })

    // Initialize Apify client
    const apifyClient = new ApifyClient({
      token: process.env.APIFY_API_KEY!,
    })

    // Run the scraper with custom input
    const actorId = 'oeiQgfg5fsmIJB7Cn' // Booking Scraper Actor ID
    const input = {
      search: destination,
      destType: 'city',
      checkIn,
      checkOut,
      rooms,
      adults,
      children,
      currency: 'USD',
      language: 'en-us',
      maxResults,
      sortBy: 'price_lowest_first'
    }

    console.log('Running Apify actor with input:', input)
    
    // Start the actor and wait for it to finish
    const run = await apifyClient.actor(actorId).call(input, {
      waitSecs: 300, // Wait up to 5 minutes
    })

    console.log(`Actor run finished: ${run.id}, status: ${run.status}`)

    // Check if run succeeded
    if (run.status !== 'SUCCEEDED') {
      return NextResponse.json({ 
        error: 'Scraper run failed',
        status: run.status,
        runId: run.id
      }, { status: 500 })
    }

    // Get the dataset
    const datasetId = run.defaultDatasetId
    if (!datasetId) {
      return NextResponse.json({ error: 'No dataset found' }, { status: 400 })
    }

    console.log(`Fetching dataset: ${datasetId}`)
    const dataset = apifyClient.dataset(datasetId)
    const { items: hotels } = await dataset.listItems()

    console.log(`Received ${hotels.length} hotels from Apify`)

    // Initialize Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Insert hotels into Supabase
    let inserted = 0
    const now = new Date().toISOString()
    
    for (const hotel of hotels) {
      const priceData = {
        hotel_id: hotel.name || hotel.url || 'Unknown',
        user_id: userId || null,
        price: hotel.price?.value || 0,
        currency: hotel.price?.currency || 'USD',
        check_in_date: checkIn,
        check_out_date: checkOut,
        room_type: hotel.roomType || 'Standard',
        source: 'apify-booking',
        search_destination: destination,
        search_params: {
          rooms,
          adults,
          children,
          destination
        },
        raw_data: hotel,
        created_at: now
      }

      const { error } = await supabase
        .from('price_history')
        .insert(priceData)

      if (error) {
        console.error(`Error inserting hotel ${hotel.name}:`, error)
      } else {
        inserted++
      }
    }

    console.log(`Successfully inserted ${inserted}/${hotels.length} hotels into Supabase`)

    return NextResponse.json({
      success: true,
      runId: run.id,
      destination,
      checkIn,
      checkOut,
      hotelsProcessed: hotels.length,
      hotelsInserted: inserted,
      hotels: hotels.map(h => ({
        name: h.name,
        price: h.price?.value,
        currency: h.price?.currency,
        rating: h.rating,
        url: h.url
      }))
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
