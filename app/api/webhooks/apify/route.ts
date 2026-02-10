import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Initialize Supabase client lazily with proper error handling
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Lazy initialization - only create client when needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: any = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = getSupabaseClient();
  }
  return _supabase;
}

/**
 * Apify Webhook Handler
 * 
 * Receives notifications from Apify when actor runs complete.
 * Automatically processes results and saves to database.
 * 
 * Webhook URL: https://your-domain.vercel.app/api/webhooks/apify
 * 
 * Expected payload from Apify:
 * {
 *   "userId": "string",
 *   "createdAt": "ISO date",
 *   "eventType": "ACTOR.RUN.SUCCEEDED" | "ACTOR.RUN.FAILED",
 *   "eventData": {
 *     "actorId": "string",
 *     "actorRunId": "string",
 *     "status": "SUCCEEDED" | "FAILED"
 *   },
 *   "resource": {
 *     "id": "string",
 *     "actId": "string",
 *     "status": "SUCCEEDED" | "FAILED",
 *     "defaultDatasetId": "string"
 *   }
 * }
 */

interface ApifyWebhookPayload {
  userId: string;
  createdAt: string;
  eventType: string;
  eventData: {
    actorId: string;
    actorRunId: string;
    status: string;
  };
  resource: {
    id: string;
    actId: string;
    status: string;
    defaultDatasetId?: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Get Supabase client first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any;
  try {
    supabase = getSupabase();
  } catch (error) {
    logger.error('Supabase not initialized - missing environment variables', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Service unavailable - configuration error' },
      { status: 503 }
    );
  }

  try {
    
    logger.info('Apify webhook received');
    
    // Parse payload
    const payload: ApifyWebhookPayload = await request.json();
    
    // Validate payload structure first
    if (!payload.eventData || !payload.resource) {
      logger.error('Invalid webhook payload - missing required fields');
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }
    
    logger.info('Webhook payload', {
      eventType: payload.eventType,
      status: payload.resource?.status,
      runId: payload.resource?.id,
    });

    const { eventType, resource } = payload;
    const { id: runId, status, defaultDatasetId, actId } = resource;

    // Handle successful run
    if (eventType === 'ACTOR.RUN.SUCCEEDED' && status === 'SUCCEEDED') {
      logger.info('Processing successful actor run', { runId });

      if (!defaultDatasetId) {
        logger.warn('No dataset ID in webhook payload');
        return NextResponse.json(
          { message: 'No dataset to process' },
          { status: 200 }
        );
      }

      // Fetch results from Apify dataset
      const apifyToken = process.env.APIFY_API_TOKEN;
      if (!apifyToken) {
        logger.error('APIFY_API_TOKEN not configured');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${apifyToken}`;
      logger.info('Fetching dataset from Apify...');
      
      const datasetResponse = await fetch(datasetUrl);
      if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
      }

      const results = await datasetResponse.json();
      logger.info(`Retrieved ${results.length} results from dataset`, { count: results.length });

      // Process and save results
      if (results.length > 0) {
        const processedResults = await processApifyResults(results, runId, supabase);
        logger.info(`Processed ${processedResults.saved} results, ${processedResults.errors} errors`, { saved: processedResults.saved, errors: processedResults.errors });

        return NextResponse.json({
          success: true,
          message: 'Webhook processed successfully',
          stats: {
            totalResults: results.length,
            saved: processedResults.saved,
            errors: processedResults.errors,
            processingTime: Date.now() - startTime,
          },
        });
      } else {
        logger.info('Dataset is empty');
        return NextResponse.json({
          success: true,
          message: 'Dataset is empty',
        });
      }
    }

    // Handle failed run
    if (eventType === 'ACTOR.RUN.FAILED' || status === 'FAILED') {
      logger.error('Actor run failed', undefined, { runId });
      
      // Log the failure
      await supabase.from('scan_logs').insert({
        scan_type: 'apify_actor',
        hotel_id: 'unknown',
        status: 'error',
        message: `Apify actor run failed: ${runId}`,
        metadata: { runId, actId, eventType },
      });

      return NextResponse.json({
        success: false,
        message: 'Actor run failed',
        runId,
      });
    }

    // Handle other event types
    logger.info(`Unhandled event type: ${eventType}`, { eventType });
    return NextResponse.json({
      success: true,
      message: `Event ${eventType} acknowledged`,
    });

  } catch (error) {
    logger.error('Webhook processing error', error instanceof Error ? error : new Error(String(error)));
    
    // Log error to database
    await supabase.from('scan_logs').insert({
      scan_type: 'apify_webhook',
      hotel_id: 'unknown',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      metadata: { error: String(error) },
    });

    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Process Apify results and save to database
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processApifyResults(results: any[], runId: string, supabaseClient: any) {
  let saved = 0;
  let errors = 0;

  for (const result of results) {
    try {
      // Extract hotel data from Apify result
      const {
        hotelName,
        checkIn,
        checkOut,
        price,
        currency = 'ILS',
        occupancy,
        roomType,
        availableRooms,
        url,
        scrapedAt,
      } = result;

      // Validate required fields
      if (!hotelName || !checkIn || !price) {
        logger.warn('Skipping result - missing required fields', { result });
        errors++;
        continue;
      }

      // Find or create hotel
      let { data: hotel, error: hotelError } = await supabaseClient
        .from('hotels')
        .select('id')
        .eq('name', hotelName)
        .single();

      if (hotelError || !hotel) {
        // Create new hotel
        const { data: newHotel, error: createError } = await supabaseClient
          .from('hotels')
          .insert({ name: hotelName, location: 'Unknown' })
          .select('id')
          .single();

        if (createError) {
          logger.error('Failed to create hotel', createError instanceof Error ? createError : new Error(String(createError)));
          errors++;
          continue;
        }
        hotel = newHotel;
      }

      // Save scan result
      const { error: scanError } = await supabaseClient
        .from('scans')
        .insert({
          hotel_id: hotel.id,
          check_in: checkIn,
          check_out: checkOut,
          price: parseFloat(price),
          currency,
          occupancy: occupancy ? parseInt(occupancy) : null,
          room_type: roomType,
          available_rooms: availableRooms ? parseInt(availableRooms) : null,
          source_url: url,
          scan_method: 'apify',
          metadata: {
            runId,
            scrapedAt: scrapedAt || new Date().toISOString(),
          },
        });

      if (scanError) {
        logger.error('Failed to save scan', scanError instanceof Error ? scanError : new Error(String(scanError)));
        errors++;
      } else {
        saved++;
      }

    } catch (err) {
      logger.error('Error processing result', err instanceof Error ? err : new Error(String(err)));
      errors++;
    }
  }

  return { saved, errors };
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Apify webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
