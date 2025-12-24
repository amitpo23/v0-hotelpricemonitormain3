import { ApifyClient } from 'apify-client'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { hotelName, city, checkIn, checkOut } = await request.json()
    
    const APIFY_API_KEY = process.env.APIFY_API_KEY
    if (!APIFY_API_KEY) {
      return NextResponse.json({ error: 'No Apify API key' }, { status: 500 })
    }

    console.log('🧪 Testing Voyager Booking Scraper...')
    console.log(`Hotel: ${hotelName}, City: ${city}`)
    console.log(`Dates: ${checkIn} to ${checkOut}`)

    const client = new ApifyClient({ token: APIFY_API_KEY })
    const ACTOR_ID = "voyager/booking-scraper"

    const searchUrl = `https://www.booking.com/searchresults.html?` +
      `ss=${encodeURIComponent(hotelName + ' ' + city)}` +
      `&checkin=${checkIn}` +
      `&checkout=${checkOut}` +
      `&group_adults=2` +
      `&no_rooms=1`

    console.log('URL:', searchUrl)

    const input = {
      startUrls: [{ url: searchUrl }],
      maxItems: 3,
      propertyType: "none",
      minScore: "0",
      maxPages: 1,
      currency: "USD",
      language: "en-gb"
    }

    console.log('Starting actor...')
    const run = await client.actor(ACTOR_ID).call(input, { memory: 2048 })
    
    console.log(`✅ Actor started, run ID: ${run.id}`)
    console.log('Waiting for completion...')
    
    const finished = await client.run(run.id).waitForFinish({ waitSecs: 200 })
    
    console.log(`Status: ${finished.status}`)
    
    const { items } = await client.dataset(finished.defaultDatasetId).listItems()
    
    console.log(`Items found: ${items.length}`)
    
    if (items.length > 0) {
      console.log('First item:', JSON.stringify(items[0], null, 2))
      
      // Voyager returns simple price field
      const firstHotel = items[0]
      
      return NextResponse.json({
        success: true,
        status: finished.status,
        hotelsFound: items.length,
        firstHotel: {
          name: firstHotel.name,
          price: firstHotel.price,
          currency: firstHotel.currency || 'USD',
          url: firstHotel.url
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      status: finished.status,
      hotelsFound: 0,
      message: 'No hotels found'
    })
    
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
