/**
 * Medici Hotels - Sync API
 * Sync Medici data with local competitor price tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeMediciPrices, integrateMediciPrices, comparePriceWithMedici } from '@/lib/medici/scraper';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/medici/sync
 * Sync Medici prices to competitor_daily_prices table
 *
 * Request body:
 * - hotelId: number (your hotel ID)
 * - competitorId: number (Medici competitor ID)
 * - city: string
 * - checkIn: string
 * - checkOut: string
 * - stars?: number
 * - hotelName?: string
 * - adults?: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelId, competitorId, city, checkIn, checkOut, stars, hotelName, adults } = body;

    // Validate required fields
    if (!hotelId || !competitorId || !city || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required fields: hotelId, competitorId, city, checkIn, checkOut' },
        { status: 400 }
      );
    }

    // Get Medici price data
    const priceRecords = await integrateMediciPrices(
      hotelId,
      competitorId,
      city,
      checkIn,
      checkOut,
      { stars, hotelName, adults }
    );

    if (priceRecords.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'No Medici prices found for the specified criteria',
      });
    }

    // Save to database
    const supabase = createClient();
    const { data, error } = await supabase
      .from('competitor_daily_prices')
      .upsert(priceRecords, {
        onConflict: 'hotel_id,competitor_id,date,source',
      })
      .select();

    if (error) {
      console.error('Database upsert error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: priceRecords.length,
      data: data,
      message: `Successfully synced ${priceRecords.length} Medici price records`,
    });
  } catch (error: any) {
    console.error('Medici sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Sync failed',
        message: error.message || 'Failed to sync Medici data',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * GET /api/medici/sync/compare?yourPrice=100&city=Barcelona&checkIn=2024-03-01&checkOut=2024-03-05
 * Compare your price with Medici market average
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const yourPrice = searchParams.get('yourPrice');
    const city = searchParams.get('city');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const stars = searchParams.get('stars') ? parseInt(searchParams.get('stars')!) : undefined;

    if (!yourPrice || !city || !checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required parameters: yourPrice, city, checkIn, checkOut' },
        { status: 400 }
      );
    }

    const comparison = await comparePriceWithMedici(
      parseFloat(yourPrice),
      city,
      checkIn,
      checkOut,
      stars
    );

    return NextResponse.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    console.error('Medici comparison error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Comparison failed',
        message: error.message || 'Failed to compare with Medici prices',
      },
      { status: error.statusCode || 500 }
    );
  }
}
