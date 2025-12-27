/**
 * Auto-scan Cron Job Endpoint
 * 
 * This endpoint is called every 72 hours by Vercel Cron or Railway Cron
 * to automatically scan missing dates for Q1 2026.
 * 
 * Features:
 * - Uses checkpoint system to resume from where it stopped
 * - Only scans missing dates (not already completed)
 * - Retries failed dates
 * 
 * Schedule: Every 72 hours (cron: 0 *​/72 * * *)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CHECKPOINT_FILE = join(process.cwd(), '.missing-dates-checkpoint.json');
const MISSING_DATES_FILE = join(process.cwd(), 'missing-dates.txt');
const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';

export async function GET(request: NextRequest) {
  console.log("🕐 Auto-scan cron job triggered");

  // Verify cron secret (security)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("❌ Unauthorized cron request");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Load checkpoint
    let checkpoint: any = null;
    if (existsSync(CHECKPOINT_FILE)) {
      checkpoint = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8'));
      console.log(`📂 Found checkpoint: ${checkpoint.completed_dates.length} dates completed`);
    }

    // Load missing dates
    if (!existsSync(MISSING_DATES_FILE)) {
      console.log('⚠️ missing-dates.txt not found, scanning full 90 days');
      return await scanFull90Days(request);
    }

    const missingDates = readFileSync(MISSING_DATES_FILE, 'utf-8')
      .split('\n')
      .filter(d => d.trim())
      .sort();

    if (!checkpoint) {
      checkpoint = {
        started_at: new Date().toISOString(),
        completed_dates: [],
        failed_dates: [],
        last_completed_date: null,
        stats: {
          total_prices: 0,
          successful_scans: 0,
          failed_scans: 0,
        }
      };
    }

    // Filter dates to scan (not completed yet)
    const datesToScan = missingDates.filter(d => 
      !checkpoint.completed_dates.includes(d)
    );

    // Add failed dates for retry
    const allDatesToScan = [...new Set([...checkpoint.failed_dates, ...datesToScan])].sort();

    console.log(`📋 Dates to scan: ${allDatesToScan.length}`);
    console.log(`   New: ${datesToScan.length}`);
    console.log(`   Retry: ${checkpoint.failed_dates.length}`);

    if (allDatesToScan.length === 0) {
      console.log('✅ All dates completed!');
      return NextResponse.json({
        success: true,
        message: 'All dates already scanned',
        stats: checkpoint.stats
      });
    }

    // Scan dates (limit to 10 per cron run to avoid timeout)
    const batchSize = 10;
    const batch = allDatesToScan.slice(0, batchSize);
    console.log(`🔄 Scanning batch of ${batch.length} dates...`);

    const results = [];
    for (const date of batch) {
      const result = await scanDate(date);
      results.push(result);

      if (result.success) {
        checkpoint.completed_dates.push(date);
        checkpoint.last_completed_date = date;
        checkpoint.stats.total_prices += result.prices;
        checkpoint.stats.successful_scans++;
        checkpoint.failed_dates = checkpoint.failed_dates.filter(d => d !== date);
      } else {
        checkpoint.stats.failed_scans++;
        if (!checkpoint.failed_dates.includes(date)) {
          checkpoint.failed_dates.push(date);
        }
      }

      // Save checkpoint after each date
      checkpoint.last_updated = new Date().toISOString();
      writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const scanResult = {
      success: true,
      batch_size: batch.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      remaining: allDatesToScan.length - batch.length,
      total_completed: checkpoint.completed_dates.length,
      total_missing: missingDates.length
    };

    // Log the results
    const logData = {
      event_type: "auto_scan_checkpoint",
      hotel_id: HOTEL_ID,
      batch_scanned: scanResult.batch_size,
      successful: scanResult.successful,
      failed: scanResult.failed,
      remaining: scanResult.remaining,
      total_completed: scanResult.total_completed,
      total_missing: scanResult.total_missing,
      triggered_at: new Date().toISOString(),
    };

    console.log("✅ Auto-scan batch completed:", logData);

    // Save log to database
    await supabase.from("scan_logs").insert({
      hotel_id: HOTEL_ID,
      scan_type: "auto_cron_checkpoint",
      status: "completed",
      results_count: checkpoint.stats.total_prices,
      triggered_at: new Date().toISOString(),
      scan_metadata: logData,
    });

    return NextResponse.json({
      success: true,
      message: scanResult.remaining > 0 
        ? `Batch completed. ${scanResult.remaining} dates remaining (${scanResult.progress}% done).`
        : "All dates completed! 🎉",
      results: scanResult,
    });
  } catch (error) {
    console.error("❌ Auto-scan failed:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log error to database
    await supabase.from("scan_logs").insert({
      hotel_id: HOTEL_ID,
      scan_type: "auto_cron_checkpoint",
      status: "failed",
      error_message: errorMessage,
      triggered_at: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Scan a single date
 */
async function scanDate(date: string): Promise<{ success: boolean; prices: number; error?: string }> {
  try {
    console.log(`  🔍 Scanning ${date}...`);
    
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/scans/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotel_id: HOTEL_ID,
        start_date: date,
        days_to_scan: 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (data.success) {
      console.log(`  ✅ Completed: ${data.results_count || 0} prices`);
      return { success: true, prices: data.results_count || 0 };
    } else {
      throw new Error(data.error || 'Unknown error');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`  ❌ Failed: ${errorMsg}`);
    return { success: false, prices: 0, error: errorMsg };
  }
}

/**
 * Fallback: Scan full 90 days (old behavior)
 */
async function scanFull90Days() {
  const { data: hotel } = await supabase
    .from("hotels")
    .select("*")
    .eq("id", HOTEL_ID)
    .single();

  if (!hotel) {
    throw new Error('Hotel not found');
  }

  const today = new Date();
  const startDate = today.toISOString().split('T')[0];

  const scanResponse = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/scans/execute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotel_id: HOTEL_ID,
        start_date: startDate,
        days_to_scan: 90,
      }),
    }
  );

  const scanResult = await scanResponse.json();

  if (!scanResponse.ok) {
    throw new Error(scanResult.error || 'Scan failed');
  }

  return NextResponse.json({
    success: true,
    message: "Full 90-day scan completed",
    results: scanResult,
  });
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}

