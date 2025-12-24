import { NextResponse } from "next/server"
import { scrapeBookingPrices } from "@/lib/scraper/booking-scraper"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(request: Request) {
  console.log("\n" + "=".repeat(80))
  console.log("[TEST] Direct Scraper Test Started")
  console.log("=".repeat(80))

  try {
    const body = await request.json()
    const { hotelName = "cucu hotel", city = "Tel Aviv", days = 1, bookingUrl } = body

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const checkIn = today.toISOString().split("T")[0]
    const checkOut = tomorrow.toISOString().split("T")[0]

    console.log(`[TEST] Hotel: ${hotelName}`)
    console.log(`[TEST] City: ${city}`)
    console.log(`[TEST] Check-in: ${checkIn}`)
    console.log(`[TEST] Check-out: ${checkOut}`)
    console.log(`[TEST] Booking URL: ${bookingUrl || "Not provided"}`)
    console.log("=".repeat(80) + "\n")

    const startTime = Date.now()

    const result = await scrapeBookingPrices(hotelName, city, checkIn, checkOut, bookingUrl)

    const elapsed = Date.now() - startTime

    console.log("\n" + "=".repeat(80))
    console.log("[TEST] RESULT")
    console.log("=".repeat(80))
    console.log(`Success: ${result.success}`)
    console.log(`Source: ${result.source}`)
    console.log(`Method: ${result.method}`)
    console.log(`Rooms found: ${result.results?.length || 0}`)
    console.log(`Time: ${elapsed}ms`)
    console.log(`Error: ${result.error || "None"}`)

    if (result.results && result.results.length > 0) {
      console.log(`\nRooms:`)
      result.results.forEach((room, i) => {
        console.log(`  ${i + 1}. ${room.roomType}: ₪${room.price} (${room.currency})`)
      })
    }
    console.log("=".repeat(80) + "\n")

    return NextResponse.json({
      success: result.success,
      source: result.source,
      method: result.method,
      roomsFound: result.results?.length || 0,
      elapsed: `${elapsed}ms`,
      rooms: result.results,
      error: result.error,
    })
  } catch (error) {
    console.error("\n" + "=".repeat(80))
    console.error("[TEST] FATAL ERROR")
    console.error("=".repeat(80))
    console.error(error)
    console.error("=".repeat(80) + "\n")

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
