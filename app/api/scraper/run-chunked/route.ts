import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Chunked Scraper API
 *
 * This endpoint automatically splits large date ranges into manageable chunks
 * to avoid timeout issues. Each chunk is processed sequentially.
 *
 * Request body:
 * - hotelId: string (required)
 * - roomTypeId: string (optional)
 * - totalDays: number (default: 180, max: 365)
 * - chunkSize: number (default: 30, max: 60)
 * - useRealScraping: boolean (default: true)
 */
export async function POST(request: Request) {
  const startTime = new Date()
  console.log("[ChunkedScraper] Starting chunked scraper at:", startTime.toISOString())

  try {
    const supabase = await createClient()

    let requestBody
    try {
      requestBody = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const {
      hotelId,
      roomTypeId,
      totalDays = 180,
      chunkSize = 30,
      useRealScraping = true,
    } = requestBody

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId is required" }, { status: 400 })
    }

    // Validate parameters
    const validTotalDays = Math.min(Math.max(totalDays, 1), 365)
    const validChunkSize = Math.min(Math.max(chunkSize, 7), 60)
    const numChunks = Math.ceil(validTotalDays / validChunkSize)

    console.log(`[ChunkedScraper] Configuration:`, {
      hotelId,
      totalDays: validTotalDays,
      chunkSize: validChunkSize,
      numChunks,
      useRealScraping,
    })

    // Get hotel info for validation
    const { data: hotel, error: hotelError } = await supabase
      .from("hotels")
      .select("*")
      .eq("id", hotelId)
      .single()

    if (hotelError || !hotel) {
      return NextResponse.json({ error: "Hotel not found" }, { status: 404 })
    }

    const results = []
    let totalSuccessful = 0
    let totalFailed = 0
    let totalPricesSaved = 0

    // Process each chunk
    for (let chunkIndex = 0; chunkIndex < numChunks; chunkIndex++) {
      const startDayOffset = chunkIndex * validChunkSize
      const remainingDays = validTotalDays - startDayOffset
      const currentChunkSize = Math.min(validChunkSize, remainingDays)

      console.log(
        `[ChunkedScraper] Processing chunk ${chunkIndex + 1}/${numChunks}: Days ${startDayOffset} to ${startDayOffset + currentChunkSize - 1}`,
      )

      try {
        // Call the main scraper API for this chunk
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

        const response = await fetch(`${baseUrl}/api/scraper/run-full`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hotelId,
            roomTypeId,
            daysToScan: currentChunkSize,
            startDayOffset,
            useRealScraping,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error(`[ChunkedScraper] Chunk ${chunkIndex + 1} failed:`, errorData)
          results.push({
            chunkIndex: chunkIndex + 1,
            startDay: startDayOffset,
            endDay: startDayOffset + currentChunkSize - 1,
            status: "failed",
            error: errorData.error || "Unknown error",
          })
          continue
        }

        const chunkResult = await response.json()
        totalSuccessful += chunkResult.scrapingStats?.successful || 0
        totalFailed += chunkResult.scrapingStats?.failed || 0
        totalPricesSaved += chunkResult.daysScanned || 0

        results.push({
          chunkIndex: chunkIndex + 1,
          startDay: startDayOffset,
          endDay: startDayOffset + currentChunkSize - 1,
          status: "completed",
          scrapingStats: chunkResult.scrapingStats,
          scanId: chunkResult.scanId,
        })

        console.log(`[ChunkedScraper] Chunk ${chunkIndex + 1}/${numChunks} completed successfully`)

        // Small delay between chunks to avoid overloading
        if (chunkIndex < numChunks - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error) {
        console.error(`[ChunkedScraper] Error processing chunk ${chunkIndex + 1}:`, error)
        results.push({
          chunkIndex: chunkIndex + 1,
          startDay: startDayOffset,
          endDay: startDayOffset + currentChunkSize - 1,
          status: "error",
          error: String(error),
        })
      }
    }

    const endTime = new Date()
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000

    console.log(
      `[ChunkedScraper] Completed in ${durationSeconds}s. Total successful: ${totalSuccessful}, Total failed: ${totalFailed}`,
    )

    const successfulChunks = results.filter((r) => r.status === "completed").length
    const failedChunks = results.filter((r) => r.status === "failed" || r.status === "error").length

    return NextResponse.json({
      success: true,
      message: `Chunked scan completed: ${successfulChunks}/${numChunks} chunks successful`,
      config: {
        totalDays: validTotalDays,
        chunkSize: validChunkSize,
        numChunks,
      },
      stats: {
        chunksSuccessful: successfulChunks,
        chunksFailed: failedChunks,
        totalScrapesSuccessful: totalSuccessful,
        totalScrapesFailed: totalFailed,
        durationSeconds: Math.round(durationSeconds),
      },
      chunks: results,
    })
  } catch (error) {
    console.error("[ChunkedScraper] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Chunked scraper failed",
        details: String(error),
      },
      { status: 500 },
    )
  }
}
