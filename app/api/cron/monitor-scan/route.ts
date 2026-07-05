/**
 * Scan Monitor Cron - Checks every hour and restarts if needed
 * 
 * This endpoint checks if there are incomplete scans and triggers
 * the auto-scan endpoint if needed.
 * 
 * Schedule: Every hour (0 * * * *)
 */

import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { requireCronAuth } from "@/lib/auth/cron-auth";

const CHECKPOINT_FILE = join(process.cwd(), '.missing-dates-checkpoint.json');
const MISSING_DATES_FILE = join(process.cwd(), 'missing-dates.txt');

export async function GET(request: NextRequest) {
  console.log("🔍 Scan monitor cron job triggered");

  const denied = requireCronAuth(request)
  if (denied) return denied

  try {
    // Check if files exist
    if (!existsSync(MISSING_DATES_FILE)) {
      console.log("ℹ️ No missing-dates.txt - nothing to monitor");
      return NextResponse.json({
        success: true,
        message: "No scan to monitor",
        action: "none"
      });
    }

    const missingDates = readFileSync(MISSING_DATES_FILE, 'utf-8')
      .split('\n')
      .filter(d => d.trim())
      .sort();

    // Load checkpoint
    let checkpoint: any = null;
    if (existsSync(CHECKPOINT_FILE)) {
      checkpoint = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf-8'));
    }

    if (!checkpoint) {
      console.log("💡 No checkpoint found - will let auto-scan create it");
      return NextResponse.json({
        success: true,
        message: "Checkpoint not started yet",
        action: "none"
      });
    }

    // Calculate progress
    const totalDates = missingDates.length;
    const completedDates = checkpoint.completed_dates.length;
    const progress = Math.round((completedDates / totalDates) * 100);

    console.log(`📊 Progress: ${completedDates}/${totalDates} (${progress}%)`);

    // Check if completed
    if (completedDates >= totalDates) {
      console.log("✅ All dates completed!");
      return NextResponse.json({
        success: true,
        message: "All dates completed",
        action: "completed",
        stats: checkpoint.stats
      });
    }

    // Check last update time
    const lastUpdated = new Date(checkpoint.last_updated);
    const hoursSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);

    console.log(`⏰ Last update: ${hoursSinceUpdate.toFixed(1)} hours ago`);

    // If last update was more than 1 hour ago, trigger restart
    if (hoursSinceUpdate > 1) {
      console.log("🚨 Scan appears stuck - triggering restart");
      
      // Use VERCEL_URL if available (for deployed environments), otherwise localhost
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
      
      if (!baseUrl) {
        console.log("⚠️ No app URL configured - skipping restart trigger");
        return NextResponse.json({
          success: true,
          message: "Scan appears stuck but no app URL configured",
          action: "no_url",
          progress: {
            completed: completedDates,
            total: totalDates,
            percentage: progress,
          }
        });
      }
      
      const response = await fetch(`${baseUrl}/api/cron/auto-scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
      });

      const result = await response.json();

      return NextResponse.json({
        success: true,
        message: "Scan restarted",
        action: "restarted",
        progress: {
          completed: completedDates,
          total: totalDates,
          percentage: progress,
        },
        restart_result: result
      });
    }

    // Scan is active and progressing
    return NextResponse.json({
      success: true,
      message: "Scan is progressing normally",
      action: "monitoring",
      progress: {
        completed: completedDates,
        total: totalDates,
        percentage: progress,
        last_updated: checkpoint.last_updated,
        hours_since_update: hoursSinceUpdate.toFixed(1)
      }
    });

  } catch (error) {
    console.error("❌ Monitor failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}
