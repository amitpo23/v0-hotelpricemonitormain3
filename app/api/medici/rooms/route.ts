/**
 * Medici Hotels - Rooms API
 * Manage active rooms, sales, cancellations, and archives
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediciClient } from '@/lib/medici';
import { RoomsActiveApiParams, RoomArchiveFilterDto } from '@/lib/medici/types';

/**
 * GET /api/medici/rooms?type=active|sales|cancelled|archive
 * Get rooms by type with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'active';
    const city = searchParams.get('city') || undefined;
    const hotelName = searchParams.get('hotelName') || undefined;
    const hotelStars = searchParams.get('hotelStars')
      ? parseInt(searchParams.get('hotelStars')!)
      : undefined;
    const provider = searchParams.get('provider') || undefined;

    const medici = getMediciClient();

    // Build filter params
    const params: RoomsActiveApiParams = {
      city,
      hotelName,
      hotelStars,
      provider,
    };

    // Get rooms by type
    let data;
    switch (type) {
      case 'sales':
        data = await medici.getRoomsSales(params);
        break;
      case 'cancelled':
        data = await medici.getRoomsCancel(params);
        break;
      case 'archive':
        const archiveParams: RoomArchiveFilterDto = {
          city,
          hotelName,
          pageNumber: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
          pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!) : 50,
        };
        const archiveData = await medici.getRoomArchiveData(archiveParams);
        return NextResponse.json({
          success: true,
          ...archiveData,
        });
      case 'active':
      default:
        data = await medici.getRoomsActive(params);
        break;
    }

    return NextResponse.json({
      success: true,
      type,
      count: data.length,
      data,
    });
  } catch (error: any) {
    console.error('Medici get rooms error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Failed to get rooms',
        message: error.message || 'Failed to retrieve rooms',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * POST /api/medici/rooms
 * Update room push price
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { preBookId, pushPrice } = body;

    if (!preBookId || !pushPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: preBookId and pushPrice' },
        { status: 400 }
      );
    }

    if (pushPrice < 1 || pushPrice > 10000) {
      return NextResponse.json(
        { error: 'pushPrice must be between 1 and 10000' },
        { status: 400 }
      );
    }

    const medici = getMediciClient();
    const result = await medici.updateRoomsActivePushPrice({
      preBookId,
      pushPrice,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Push price updated successfully',
    });
  } catch (error: any) {
    console.error('Medici update room price error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Failed to update price',
        message: error.message || 'Failed to update room price',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/medici/rooms?preBookId=123
 * Cancel an active room
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const preBookId = searchParams.get('preBookId');

    if (!preBookId) {
      return NextResponse.json(
        { error: 'Missing required parameter: preBookId' },
        { status: 400 }
      );
    }

    const medici = getMediciClient();
    const result = await medici.cancelRoomActive(parseInt(preBookId));

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Room cancelled successfully',
    });
  } catch (error: any) {
    console.error('Medici cancel room error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Failed to cancel room',
        message: error.message || 'Failed to cancel room',
      },
      { status: error.statusCode || 500 }
    );
  }
}
