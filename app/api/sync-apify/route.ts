import { ApifyClient } from 'apify-client'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.split(' ')[1]
    
    // Simple auth check
    if (token !== process.env.SYNC_SECRET_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting Apify sync...')

    // Initialize Apify client
    const apifyClient = new ApifyClient({
      token: process.env.APIFY_API_KEY!,
    })

    // Get the task
    const taskId = 'QzWpOGRuEVWix0W9Z'
    const task = apifyClient.task(taskId)

    // Get the last run
    const { items: runs } = await task.listRuns({
      limit: 1,
      desc: true,
    })

    if (!runs || runs.length === 0) {
      return NextResponse.json({ message: 'No runs found' }, { status: 200 })
    }

    const lastRun = runs[0]
    console.log(`Processing run: ${lastRun.id}, status: ${lastRun.status}`)

    // Check if run succeeded
    if (lastRun.status !== 'SUCCEEDED') {
      return NextResponse.json({ 
        message: 'Last run not succeeded', 
        status: lastRun.status 
      }, { status: 200 })
    }

    // Get the dataset
    const datasetId = lastRun.defaultDatasetId
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
    for (const hotel of hotels) {
      const priceData = {
        hotel_id: hotel.name || 'Unknown',
        user_id: null,
        price: hotel.price?.value || 0,
        currency: hotel.price?.currency || 'USD',
        check_in_date: new Date().toISOString(),
        check_out_date: new Date().toISOString(),
        room_type: hotel.categoryReviews?.[0] || 'Standard',
        source: 'apify',
        raw_data: hotel,
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
      runId: lastRun.id,
      hotelsProcessed: hotels.length,
      hotelsInserted: inserted,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
