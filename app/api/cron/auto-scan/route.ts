/**
 * Auto-scan Cron Job Endpoint
 *
 * This endpoint is called every 72 hours by Vercel Cron or Railway Cron
 * to automatically scan missing dates for Q1 2026.
 *
 * Features:
 * - Uses database checkpoint system (serverless-compatible)
 * - Only scans missing dates (not already completed)
 * - Retries failed dates
 *
 * Schedule: Every 72 hours
 */

import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireCronAuth } from "@/lib/auth/cron-auth";

const HOTEL_ID = '716e1e8f-3537-4f67-875d-de3a89642175';

function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

interface ScanCheckpoint {
  id?: string;
  hotel_id: string;
  completed_dates: string[];
  failed_dates: string[];
  last_completed_date: string | null;
  stats: {
    total_prices: number;
    successful_scans: number;
    failed_scans: number;
  };
  started_at: string;
  last_updated: string;
}

async function loadCheckpoint(supabase: any): Promise<ScanCheckpoint | null> {
  const { data } = await supabase
    .from("scan_checkpoints")
    .select("*")
    .eq("hotel_id", HOTEL_ID)
    .order("last_updated", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ScanCheckpoint | null;
}

async function saveCheckpoint(supabase: any, checkpoint: ScanCheckpoint): Promise<void> {
  checkpoint.last_updated = new Date().toISOString();

  if (checkpoint.id) {
    const updateData: Record<string, any> = {
      completed_dates: checkpoint.completed_dates,
      failed_dates: checkpoint.failed_dates,
      last_completed_date: checkpoint.last_completed_date,
      stats: checkpoint.stats,
      last_updated: checkpoint.last_updated,
    };
    await (supabase as any)
      .from("scan_checkpoints")
      .update(updateData)
      .eq("id", checkpoint.id);
  } else {
    await (supabase as any)
      .from("scan_checkpoints")
      .insert(checkpoint);
  }
}

export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request)
  if (denied) return denied

  const supabase = getSupabaseClient();

  try {
    // Load checkpoint from database
    let checkpoint = await loadCheckpoint(supabase);

    // Get missing dates from scan_logs or generate date range
    const { data: existingScans } = await supabase
      .from("scan_logs")
      .select("scan_metadata")
      .eq("hotel_id", HOTEL_ID)
      .eq("scan_type", "auto_cron_checkpoint")
      .eq("status", "completed");

    // Generate the 90-day date range
    const today = new Date();
    const missingDates: string[] = [];
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      missingDates.push(date.toISOString().split('T')[0]);
    }

    if (!checkpoint) {
      checkpoint = {
        hotel_id: HOTEL_ID,
        started_at: new Date().toISOString(),
        completed_dates: [],
        failed_dates: [],
        last_completed_date: null,
        stats: {
          total_prices: 0,
          successful_scans: 0,
          failed_scans: 0,
        },
        last_updated: new Date().toISOString(),
      };
    }

    // Filter dates to scan (not completed yet)
    const datesToScan = missingDates.filter(d =>
      !checkpoint.completed_dates.includes(d)
    );

    // Add failed dates for retry
    const allDatesToScan = [...new Set([...checkpoint.failed_dates, ...datesToScan])].sort();

    if (allDatesToScan.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All dates already scanned',
        stats: checkpoint.stats
      });
    }

    // Scan dates (limit to 10 per cron run to avoid timeout)
    const batchSize = 10;
    const batch = allDatesToScan.slice(0, batchSize);

    const results = [];
    for (const date of batch) {
      const result = await scanDate(date);
      results.push(result);

      if (result.success) {
        checkpoint.completed_dates.push(date);
        checkpoint.last_completed_date = date;
        checkpoint.stats.total_prices += result.prices;
        checkpoint.stats.successful_scans++;
        checkpoint.failed_dates = checkpoint.failed_dates.filter((d: string) => d !== date);
      } else {
        checkpoint.stats.failed_scans++;
        if (!checkpoint.failed_dates.includes(date)) {
          checkpoint.failed_dates.push(date);
        }
      }

      // Save checkpoint after each date
      await saveCheckpoint(supabase, checkpoint);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 2_000));
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

    // Save log to database
    await supabase.from("scan_logs").insert({
      hotel_id: HOTEL_ID,
      scan_type: "auto_cron_checkpoint",
      status: "completed",
      results_count: checkpoint.stats.total_prices,
      triggered_at: new Date().toISOString(),
      scan_metadata: {
        event_type: "auto_scan_checkpoint",
        hotel_id: HOTEL_ID,
        batch_scanned: scanResult.batch_size,
        successful: scanResult.successful,
        failed: scanResult.failed,
        remaining: scanResult.remaining,
        total_completed: scanResult.total_completed,
        total_missing: scanResult.total_missing,
        triggered_at: new Date().toISOString(),
      },
    });

    const progressPercent = Math.round((scanResult.total_completed / scanResult.total_missing) * 100);
    return NextResponse.json({
      success: true,
      message: scanResult.remaining > 0
        ? `Batch completed. ${scanResult.remaining} dates remaining (${progressPercent}% done).`
        : "All dates completed!",
      results: scanResult,
    });
  } catch (error) {
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
    const apiUrl = process.env.NEXT_PUBLIC_APP_URL ||
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const response = await fetch(`${apiUrl}/api/scans/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
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
      return { success: true, prices: data.results_count || 0 };
    }
    throw new Error(data.error || 'Unknown error');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { success: false, prices: 0, error: errorMsg };
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
