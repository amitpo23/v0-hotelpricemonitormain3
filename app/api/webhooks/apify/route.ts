import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with proper error handling
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

let supabase: ReturnType<typeof createClient> | null = null;

try {
  supabase = getSupabaseClient();
} catch (error) {
  console.error('[Apify Webhook] Failed to initialize Supabase:', error);
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
  
  try {
    // Check if Supabase is initialized
    if (!supabase) {
      console.error('❌ Supabase not initialized - missing environment variables');
      return NextResponse.json(
        { error: 'Service unavailable - configuration error' },
        { status: 503 }
      );
    }
    
    console.log('🔔 Apify webhook received');
    
    // Parse payload
    const payload: ApifyWebhookPayload = await request.json();
    console.log('📦 Webhook payload:', {
      eventType: payload.eventType,
      status: payload.resource.status,
      runId: payload.resource.id,
    });

    // Validate payload
    if (!payload.eventData || !payload.resource) {
      console.error('❌ Invalid webhook payload - missing required fields');
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    const { eventType, resource } = payload;
    const { id: runId, status, defaultDatasetId, actId } = resource;

    // Handle successful run
    if (eventType === 'ACTOR.RUN.SUCCEEDED' && status === 'SUCCEEDED') {
      console.log('✅ Processing successful actor run:', runId);

      if (!defaultDatasetId) {
        console.warn('⚠️ No dataset ID in webhook payload');
        return NextResponse.json(
          { message: 'No dataset to process' },
          { status: 200 }
        );
      }

      // Fetch results from Apify dataset
      const apifyToken = process.env.APIFY_API_TOKEN;
      if (!apifyToken) {
        console.error('❌ APIFY_API_TOKEN not configured');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${apifyToken}`;
      console.log('📥 Fetching dataset from Apify...');
      
      const datasetResponse = await fetch(datasetUrl);
      if (!datasetResponse.ok) {
        throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
      }

      const results = await datasetResponse.json();
      console.log(`📊 Retrieved ${results.length} results from dataset`);

      // Process and save results
      if (results.length > 0) {
        const processedResults = await processApifyResults(results, runId);
        console.log(`✅ Processed ${processedResults.saved} results, ${processedResults.errors} errors`);

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
        console.log('⚠️ Dataset is empty');
        return NextResponse.json({
          success: true,
          message: 'Dataset is empty',
        });
      }
    }

    // Handle failed run
    if (eventType === 'ACTOR.RUN.FAILED' || status === 'FAILED') {
      console.error('❌ Actor run failed:', runId);
      
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
    console.log(`ℹ️ Unhandled event type: ${eventType}`);
    return NextResponse.json({
      success: true,
      message: `Event ${eventType} acknowledged`,
    });

  } catch (error) {
    console.error('💥 Webhook processing error:', error);
    
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
async function processApifyResults(results: any[], runId: string) {
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
        console.warn('⚠️ Skipping result - missing required fields:', result);
        errors++;
        continue;
      }

      // Find or create hotel
      let { data: hotel, error: hotelError } = await supabase
        .from('hotels')
        .select('id')
        .eq('name', hotelName)
        .single();

      if (hotelError || !hotel) {
        // Create new hotel
        const { data: newHotel, error: createError } = await supabase
          .from('hotels')
          .insert({ name: hotelName, location: 'Unknown' })
          .select('id')
          .single();

        if (createError) {
          console.error('❌ Failed to create hotel:', createError);
          errors++;
          continue;
        }
        hotel = newHotel;
      }

      // Save scan result
      const { error: scanError } = await supabase
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
        console.error('❌ Failed to save scan:', scanError);
        errors++;
      } else {
        saved++;
      }

    } catch (err) {
      console.error('❌ Error processing result:', err);
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
