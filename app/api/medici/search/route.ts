/**
 * Medici Hotels - Search API
 * POST /api/medici/search
 * Search for hotels using Medici Innstant API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediciClient } from '@/lib/medici';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { city, checkIn, checkOut, stars, adults, children, limit, showExtendedData } = body;

    // Validate required fields
    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required fields: checkIn and checkOut are required' },
        { status: 400 }
      );
    }

    // Get Medici client
    const medici = getMediciClient();

    // Search for hotels
    const results = await medici.searchHotels(
      city || '',
      checkIn,
      checkOut,
      {
        stars,
        adults,
        children,
        limit,
        showExtendedData,
      }
    );

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    console.error('Medici search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Search failed',
        message: error.message || 'Failed to search hotels',
        statusCode: error.statusCode || 500,
      },
      { status: error.statusCode || 500 }
    );
  }
}

// GET endpoint for quick searches with query params
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city') || '';
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');
    const stars = searchParams.get('stars') ? parseInt(searchParams.get('stars')!) : undefined;
    const adults = searchParams.get('adults') ? parseInt(searchParams.get('adults')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Validate required fields
    if (!checkIn || !checkOut) {
      return NextResponse.json(
        { error: 'Missing required query parameters: checkIn and checkOut' },
        { status: 400 }
      );
    }

    // Get Medici client
    const medici = getMediciClient();

    // Search for hotels
    const results = await medici.searchHotels(city, checkIn, checkOut, {
      stars,
      adults,
      limit,
    });

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    console.error('Medici search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Search failed',
        message: error.message || 'Failed to search hotels',
      },
      { status: error.statusCode || 500 }
    );
  }
}
