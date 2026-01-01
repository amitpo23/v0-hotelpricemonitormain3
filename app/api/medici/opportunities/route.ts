/**
 * Medici Hotels - Opportunities API
 * Manage hotel opportunities (inventory acquisition)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediciClient } from '@/lib/medici';
import { InsertOpp } from '@/lib/medici/types';

/**
 * GET /api/medici/opportunities
 * Get all opportunities or search by parameters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const opportunityId = searchParams.get('opportunityId');
    const backOfficeId = searchParams.get('backOfficeId');

    const medici = getMediciClient();

    // Search by opportunity ID
    if (opportunityId) {
      const results = await medici.getOpportunitiesHotelSearch({
        opportiunityId: parseInt(opportunityId),
      });
      return NextResponse.json({
        success: true,
        count: results.length,
        data: results,
      });
    }

    // Search by back office ID
    if (backOfficeId) {
      const results = await medici.getOpportunitiesByBackOfficeId({
        id: parseInt(backOfficeId),
      });
      return NextResponse.json({
        success: true,
        count: results.length,
        data: results,
      });
    }

    // Get all opportunities
    const opportunities = await medici.getOpportunities();

    return NextResponse.json({
      success: true,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (error: any) {
    console.error('Medici get opportunities error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Failed to get opportunities',
        message: error.message || 'Failed to retrieve opportunities',
      },
      { status: error.statusCode || 500 }
    );
  }
}

/**
 * POST /api/medici/opportunities
 * Create a new opportunity
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['startDateStr', 'endDateStr', 'boardId', 'categoryId', 'buyPrice', 'pushPrice', 'maxRooms'];
    const missing = required.filter(field => !body[field]);

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate price constraints
    if (body.buyPrice < 1 || body.buyPrice > 10000) {
      return NextResponse.json(
        { error: 'buyPrice must be between 1 and 10000' },
        { status: 400 }
      );
    }

    if (body.pushPrice < 1 || body.pushPrice > 10000) {
      return NextResponse.json(
        { error: 'pushPrice must be between 1 and 10000' },
        { status: 400 }
      );
    }

    if (body.maxRooms < 1 || body.maxRooms > 30) {
      return NextResponse.json(
        { error: 'maxRooms must be between 1 and 30' },
        { status: 400 }
      );
    }

    const medici = getMediciClient();

    // Create opportunity
    const opportunity = await medici.insertOpportunity(body as InsertOpp);

    return NextResponse.json({
      success: true,
      data: opportunity,
      message: 'Opportunity created successfully',
    });
  } catch (error: any) {
    console.error('Medici create opportunity error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.error || 'Failed to create opportunity',
        message: error.message || 'Failed to create opportunity',
      },
      { status: error.statusCode || 500 }
    );
  }
}
