/**
 * Medici Hotels - Bookings API
 * Handle pre-booking, booking confirmation, and manual bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediciClient } from '@/lib/medici';

/**
 * POST /api/medici/bookings
 * Create a pre-booking, confirm booking, or manual book
 *
 * Request body:
 * - type: 'prebook' | 'book' | 'manual'
 * - ... other booking parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...params } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type (prebook|book|manual)' },
        { status: 400 }
      );
    }

    const medici = getMediciClient();
    let result;

    switch (type) {
      case 'prebook':
        // Pre-book a room
        result = await medici.preBook(params);
        return NextResponse.json({
          success: true,
          type: 'prebook',
          data: result,
          message: 'Pre-booking created successfully',
        });

      case 'book':
        // Confirm booking
        if (!params.jsonRequest) {
          return NextResponse.json(
            { error: 'Missing required field: jsonRequest' },
            { status: 400 }
          );
        }
        result = await medici.book({ jsonRequest: params.jsonRequest });
        return NextResponse.json({
          success: true,
          type: 'book',
          data: result,
          message: 'Booking confirmed successfully',
        });

      case 'manual':
        // Manual booking
        if (!params.opportiunityId && !params.code) {
          return NextResponse.json(
            { error: 'Missing required fields: opportiunityId or code' },
            { status: 400 }
          );
        }
        result = await medici.manualBook({
          opportiunityId: params.opportiunityId,
          code: params.code,
        });
        return NextResponse.json({
          success: true,
          type: 'manual',
          data: result,
          message: 'Manual booking created successfully',
        });

      default:
        return NextResponse.json(
          { error: `Invalid booking type: ${type}. Must be prebook, book, or manual` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Medici booking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Booking failed',
        message: error.message || 'Failed to process booking',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * DELETE /api/medici/bookings
 * Cancel a booking with JSON parameters
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    const medici = getMediciClient();
    const result = await medici.cancelRoomDirectJson(body);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Booking cancelled successfully',
    });
  } catch (error: any) {
    console.error('Medici cancel booking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Cancellation failed',
        message: error.message || 'Failed to cancel booking',
      },
      { status: error.statusCode || 500 }
    );
  }
}
