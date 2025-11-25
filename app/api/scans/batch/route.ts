import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Execute scans for all active configurations
export async function POST() {
  const supabase = await createClient()

  try {
    // Get all active scan configs
    const { data: activeConfigs } = await supabase.from("scan_configs").select(`*, hotels (*)`).eq("is_active", true)

    if (!activeConfigs || activeConfigs.length === 0) {
      return NextResponse.json({
        message: "No active scan configurations found",
        scans_executed: 0,
      })
    }

    const results = []

    for (const config of activeConfigs) {
      try {
        // Call the execute endpoint for each config
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/scans/execute`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config_id: config.id }),
          },
        )

        const result = await response.json()
        results.push({
          config_id: config.id,
          hotel_name: config.hotels?.name,
          success: response.ok,
          ...result,
        })
      } catch (error) {
        results.push({
          config_id: config.id,
          hotel_name: config.hotels?.name,
          success: false,
          error: "Failed to execute scan",
        })
      }
    }

    return NextResponse.json({
      message: `Batch scan completed`,
      scans_executed: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    })
  } catch (error) {
    console.error("[v0] Batch scan error:", error)
    return NextResponse.json({ error: "Failed to execute batch scan" }, { status: 500 })
  }
}
