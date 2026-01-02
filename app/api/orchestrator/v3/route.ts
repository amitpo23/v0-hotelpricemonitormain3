/**
 * API Route: Orchestrator V3
 * GET /api/orchestrator/v3?hotelId=xxx&dates=2025-02-01,2025-02-02&location=Tel%20Aviv
 */

import { NextRequest, NextResponse } from 'next/server'
import { orchestrateComprehensiveDataV3, orchestrateSingleDateV3 } from '@/lib/agents/orchestrator-v3'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const hotelId = searchParams.get('hotelId')
    const datesParam = searchParams.get('dates')
    const location = searchParams.get('location') || 'Tel Aviv'

    if (!hotelId) {
      return NextResponse.json(
        { error: 'hotelId is required' },
        { status: 400 }
      )
    }

    // Get hotel info from database
    const supabase = await createClient()
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('name, base_price, min_price, max_price')
      .eq('id', hotelId)
      .single()

    if (hotelError || !hotel) {
      return NextResponse.json(
        { error: 'Hotel not found' },
        { status: 404 }
      )
    }

    // Parse dates
    let dates: string[]
    if (datesParam) {
      dates = datesParam.split(',').map(d => d.trim())
    } else {
      // Default: next 7 days
      dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return d.toISOString().split('T')[0]
      })
    }

    // Parse options
    const options = {
      includeVelocityV2: searchParams.get('velocityV2') !== 'false',
      includeCBS: searchParams.get('cbs') !== 'false',
      includeWeather: searchParams.get('weather') !== 'false',
      includeEventsV2: searchParams.get('eventsV2') !== 'false',
      includeHistorical: searchParams.get('historical') !== 'false',
      includeStatistics: searchParams.get('statistics') !== 'false',
      includeTrends: searchParams.get('trends') !== 'false',
      includeCompetitors: searchParams.get('competitors') !== 'false',
    }

    // Run orchestrator
    const startTime = Date.now()
    let result

    if (dates.length === 1) {
      result = await orchestrateSingleDateV3(
        hotelId,
        hotel.name,
        location,
        dates[0],
        hotel.base_price || 500,
        options
      )
    } else {
      result = await orchestrateComprehensiveDataV3(
        hotelId,
        hotel.name,
        location,
        dates,
        hotel.base_price || 500,
        options
      )
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      hotel: {
        id: hotelId,
        name: hotel.name,
        basePrice: hotel.base_price,
        minPrice: hotel.min_price,
        maxPrice: hotel.max_price,
      },
      location,
      dates,
      data: result,
      metadata: {
        processingTime,
        dataSources: result.dataSources,
        dataQuality: result.dataQuality,
        overallConfidence: result.overallConfidence,
        timestamp: result.timestamp,
      }
    })

  } catch (error) {
    console.error('[Orchestrator V3 API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to orchestrate data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
