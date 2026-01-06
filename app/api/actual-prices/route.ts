/**
 * API Endpoint for Updating Actual Prices
 * Allows manual or automated updates of actual selling prices for accuracy measurement
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export const dynamic = 'force-dynamic'

interface ActualPriceUpdate {
  hotel_id: string
  date: string
  actual_price?: number
  rooms_sold?: number
  total_revenue?: number
  room_type_id?: string
  source?: string
  notes?: string
  data_quality?: number
}

/**
 * POST - Update actual prices for specific dates
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Support both single update and batch updates
    const updates: ActualPriceUpdate[] = Array.isArray(body) ? body : [body]
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }
    
    console.log(`[Actual Prices] Processing ${updates.length} updates`)
    
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }
    
    for (const update of updates) {
      // Validate required fields
      if (!update.hotel_id || !update.date) {
        results.failed++
        results.errors.push(`Missing hotel_id or date`)
        continue
      }
      
      // Calculate revenue if not provided
      let totalRevenue = update.total_revenue
      if (!totalRevenue && update.actual_price && update.rooms_sold) {
        totalRevenue = update.actual_price * update.rooms_sold
      }
      
      // Default data quality based on source
      let dataQuality = update.data_quality ?? 1.0
      if (update.source === 'manual') dataQuality = 0.9
      if (update.source === 'booking_com') dataQuality = 1.0
      if (update.source === 'estimated') dataQuality = 0.5
      
      const { error } = await supabase
        .from('daily_actual_prices')
        .upsert({
          hotel_id: update.hotel_id,
          date: update.date,
          room_type_id: update.room_type_id || null,
          actual_price: update.actual_price || null,
          rooms_sold: update.rooms_sold || 0,
          total_revenue: totalRevenue || null,
          source: update.source || 'manual',
          data_quality: dataQuality,
          notes: update.notes || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'hotel_id,date,room_type_id'
        })
      
      if (error) {
        results.failed++
        results.errors.push(`${update.date}: ${error.message}`)
        console.error(`[Actual Prices] Error updating ${update.date}:`, error)
      } else {
        results.success++
      }
    }
    
    console.log(`[Actual Prices] Results: ${results.success} success, ${results.failed} failed`)
    
    // Trigger accuracy recalculation if we updated historical dates
    const oldestDate = updates.reduce((min, u) => u.date < min ? u.date : min, updates[0].date)
    const today = new Date().toISOString().split('T')[0]
    
    if (oldestDate < today && results.success > 0) {
      console.log(`[Actual Prices] Triggering accuracy recalculation for ${results.success} updated dates`)
      // Note: In production, this should be a background job
      // For now, just log it - the daily cron will pick it up
    }
    
    return NextResponse.json({
      success: results.failed === 0,
      message: `Updated ${results.success} actual prices, ${results.failed} failed`,
      results
    })
    
  } catch (error) {
    console.error('[Actual Prices POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * GET - Fetch actual prices for a date range
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const hotelId = searchParams.get('hotelId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const minQuality = parseFloat(searchParams.get('minQuality') || '0')
    
    if (!hotelId && !startDate) {
      return NextResponse.json({ error: 'hotelId or startDate required' }, { status: 400 })
    }
    
    let query = supabase
      .from('daily_actual_prices')
      .select('*')
      .gte('data_quality', minQuality)
      .order('date', { ascending: false })
    
    if (hotelId) {
      query = query.eq('hotel_id', hotelId)
    }
    
    if (startDate) {
      query = query.gte('date', startDate)
    }
    
    if (endDate) {
      query = query.lte('date', endDate)
    }
    
    const { data: actualPrices, error } = await query
    
    if (error) {
      console.error('[Actual Prices GET] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Calculate statistics
    const stats = {
      totalRecords: actualPrices?.length || 0,
      avgPrice: 0,
      avgRoomsSold: 0,
      totalRevenue: 0,
      dataSources: {} as Record<string, number>,
      qualityDistribution: {
        high: 0,    // >= 0.9
        medium: 0,  // 0.7-0.9
        low: 0      // < 0.7
      }
    }
    
    if (actualPrices && actualPrices.length > 0) {
      let totalPrice = 0
      let totalRooms = 0
      let priceCount = 0
      let roomsCount = 0
      
      actualPrices.forEach(ap => {
        if (ap.actual_price) {
          totalPrice += parseFloat(ap.actual_price)
          priceCount++
        }
        if (ap.rooms_sold) {
          totalRooms += ap.rooms_sold
          roomsCount++
        }
        if (ap.total_revenue) {
          stats.totalRevenue += parseFloat(ap.total_revenue)
        }
        
        // Track sources
        const source = ap.source || 'unknown'
        stats.dataSources[source] = (stats.dataSources[source] || 0) + 1
        
        // Track quality
        const quality = parseFloat(ap.data_quality || 0)
        if (quality >= 0.9) stats.qualityDistribution.high++
        else if (quality >= 0.7) stats.qualityDistribution.medium++
        else stats.qualityDistribution.low++
      })
      
      stats.avgPrice = priceCount > 0 ? totalPrice / priceCount : 0
      stats.avgRoomsSold = roomsCount > 0 ? totalRooms / roomsCount : 0
    }
    
    return NextResponse.json({
      success: true,
      actualPrices: actualPrices || [],
      stats
    })
    
  } catch (error) {
    console.error('[Actual Prices GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove actual price records (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const id = searchParams.get('id')
    const hotelId = searchParams.get('hotelId')
    const date = searchParams.get('date')
    
    if (!id && (!hotelId || !date)) {
      return NextResponse.json({ 
        error: 'Either id or (hotelId + date) required' 
      }, { status: 400 })
    }
    
    let query = supabase.from('daily_actual_prices').delete()
    
    if (id) {
      query = query.eq('id', id)
    } else {
      query = query.eq('hotel_id', hotelId!).eq('date', date!)
    }
    
    const { error } = await query
    
    if (error) {
      console.error('[Actual Prices DELETE] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Actual price record deleted'
    })
    
  } catch (error) {
    console.error('[Actual Prices DELETE] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
