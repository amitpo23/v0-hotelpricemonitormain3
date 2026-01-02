import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { updates } = body

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid updates data' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const results = []

    // Update each hotel
    for (const update of updates) {
      const { id, ...changes } = update

      if (!id) {
        results.push({ id: null, error: 'Missing hotel ID' })
        continue
      }

      // Validate fields
      const validChanges: any = {}
      
      if (changes.total_rooms !== undefined) {
        validChanges.total_rooms = parseInt(changes.total_rooms)
        if (validChanges.total_rooms < 1) {
          results.push({ id, error: 'Total rooms must be at least 1' })
          continue
        }
      }

      if (changes.base_price !== undefined) {
        validChanges.base_price = parseInt(changes.base_price)
        if (validChanges.base_price < 0) {
          results.push({ id, error: 'Base price cannot be negative' })
          continue
        }
      }

      if (changes.min_price !== undefined) {
        validChanges.min_price = parseInt(changes.min_price)
      }

      if (changes.max_price !== undefined) {
        validChanges.max_price = parseInt(changes.max_price)
      }

      // Validate min <= base <= max
      const currentHotel = await supabase
        .from('hotels')
        .select('base_price, min_price, max_price')
        .eq('id', id)
        .single()

      if (currentHotel.error) {
        results.push({ id, error: 'Hotel not found' })
        continue
      }

      const basePrice = validChanges.base_price ?? currentHotel.data.base_price
      const minPrice = validChanges.min_price ?? currentHotel.data.min_price ?? 0
      const maxPrice = validChanges.max_price ?? currentHotel.data.max_price ?? 999999

      if (minPrice > basePrice) {
        results.push({ id, error: 'Min price cannot be higher than base price' })
        continue
      }

      if (maxPrice < basePrice && maxPrice > 0) {
        results.push({ id, error: 'Max price cannot be lower than base price' })
        continue
      }

      // Update hotel
      const { error } = await supabase
        .from('hotels')
        .update(validChanges)
        .eq('id', id)

      if (error) {
        results.push({ id, error: error.message })
      } else {
        results.push({ id, success: true, changes: validChanges })
      }
    }

    // Check if all succeeded
    const allSucceeded = results.every(r => r.success)
    
    if (allSucceeded) {
      return NextResponse.json({
        success: true,
        updated: results.length,
        results
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Some updates failed',
        results
      }, { status: 207 }) // Multi-status
    }

  } catch (error) {
    console.error('Error updating hotels:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update hotels',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
