import { NextResponse } from "next/server"

/**
 * Chunked Scraper API
 *
 * Automatically splits large date ranges into manageable chunks
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
    const body = await request.json()
    const { hotelId, roomTypeId, totalDays = 180, chunkSize = 30, useRealScraping = true } = body

    if (!hotelId) {
      return NextResponse.json({ error: "hotelId is required" }, { status: 400 })
    }

    // Validate parameters
    const validTotalDays = Math.min(Math.max(totalDays, 1), 365)
    const validChunkSize = Math.min(Math.max(chunkSize, 7), 60)

    // Calculate number of chunks needed
    const numChunks = Math.ceil(validTotalDays / validChunkSize)
    console.log(`[ChunkedScraper] Will process ${numChunks} chunks of ${validChunkSize} days each`)

    const results: Array<{
      chunkIndex: number
      startDay: number
      endDay: number
      status: string
      scanId?: string
      error?: string
      stats?: Record<string, number>
    }> = []

    let totalSuccessful = 0
    let totalFailed = 0

    // Process each chunk
    for (let chunk = 0; chunk < numChunks; chunk++) {
      const startDayOffset = chunk * validChunkSize
      const daysInThisChunk = Math.min(validChunkSize, validTotalDays - startDayOffset)

      console.log(
        `[ChunkedScraper] Processing chunk ${chunk + 1}/${numChunks}: days ${startDayOffset} to ${startDayOffset + daysInThisChunk - 1}`,
      )

      try {
        // Get the base URL from the request
        const url = new URL(request.url)
        const baseUrl = `${url.protocol}//${url.host}`

        // Call the run-full API with chunk parameters
        const response = await fetch(`${baseUrl}/api/scraper/run-full`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hotelId,
            roomTypeId,
            useRealScraping,
            daysToScan: daysInThisChunk,
            startDayOffset,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          results.push({
            chunkIndex: chunk + 1,
            startDay: startDayOffset,
            endDay: startDayOffset + daysInThisChunk - 1,
            status: data.timedOut ? "partial" : "completed",
            scanId: data.scanId,
            stats: data.stats,
          })
          totalSuccessful += data.stats?.realScrapes || 0
          totalFailed += data.stats?.failedScrapes || 0
        } else {
          results.push({
            chunkIndex: chunk + 1,
            startDay: startDayOffset,
            endDay: startDayOffset + daysInThisChunk - 1,
            status: "failed",
            error: data.error || "Unknown error",
          })
        }
      } catch (error) {
        results.push({
          chunkIndex: chunk + 1,
          startDay: startDayOffset,
          endDay: startDayOffset + daysInThisChunk - 1,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }

      // Wait between chunks to avoid overwhelming the server
      if (chunk < numChunks - 1) {
        console.log("[ChunkedScraper] Waiting 2 seconds before next chunk...")
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    const successfulChunks = results.filter((r) => r.status === "completed" || r.status === "partial").length
    const duration = Math.round((Date.now() - startTime.getTime()) / 1000)

    console.log(`[ChunkedScraper] Completed: ${successfulChunks}/${numChunks} chunks successful in ${duration}s`)

    return NextResponse.json({
      success: successfulChunks > 0,
      message: `Chunked scan completed: ${successfulChunks}/${numChunks} chunks successful`,
      stats: {
        chunksTotal: numChunks,
        chunksSuccessful: successfulChunks,
        chunksFailed: numChunks - successfulChunks,
        totalScrapesSuccessful: totalSuccessful,
        totalScrapesFailed: totalFailed,
        durationSeconds: duration,
      },
      chunks: results,
    })
  } catch (error) {
    console.error("[ChunkedScraper] Error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
