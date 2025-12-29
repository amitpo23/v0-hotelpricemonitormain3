/**
 * Medici Hotels - Dashboard API
 * Get dashboard statistics and insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediciClient } from '@/lib/medici';
import { DashboardApiParams } from '@/lib/medici/types';

/**
 * GET /api/medici/dashboard
 * Get dashboard information with optional filters
 *
 * Query parameters:
 * - city: Filter by city
 * - hotelName: Filter by hotel name
 * - hotelStars: Filter by hotel stars
 * - provider: Filter by provider
 * - reservationMonth: Filter by reservation month (YYYY-MM)
 * - checkInMonth: Filter by check-in month (YYYY-MM)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Build filter params
    const params: DashboardApiParams = {
      city: searchParams.get('city') || undefined,
      hotelName: searchParams.get('hotelName') || undefined,
      hotelStars: searchParams.get('hotelStars')
        ? parseInt(searchParams.get('hotelStars')!)
        : undefined,
      provider: searchParams.get('provider') || undefined,
      reservationMonthDate: searchParams.get('reservationMonth') || undefined,
      checkInMonthDate: searchParams.get('checkInMonth') || undefined,
    };

    const medici = getMediciClient();
    const dashboard = await medici.getDashboardInfo(params);

    return NextResponse.json({
      success: true,
      data: dashboard,
      filters: params,
    });
  } catch (error: any) {
    console.error('Medici dashboard error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Failed to get dashboard',
        message: error.message || 'Failed to retrieve dashboard information',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * POST /api/medici/dashboard
 * Get dashboard information with complex filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const medici = getMediciClient();
    const dashboard = await medici.getDashboardInfo(body as DashboardApiParams);

    return NextResponse.json({
      success: true,
      data: dashboard,
      filters: body,
    });
  } catch (error: any) {
    console.error('Medici dashboard error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Failed to get dashboard',
        message: error.message || 'Failed to retrieve dashboard information',
      },
      { status: error.statusCode || 500 }
    );
  }
}
