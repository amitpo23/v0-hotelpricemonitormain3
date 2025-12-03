/**
 * Scraper Wrapper - Calls Python scraper and handles results
 */

import { spawn } from "child_process"
import path from "path"

export interface ScraperResult {
  date: string
  price: number | null
  currency: string
  room_type: string
  available: boolean
  error?: string
}

export interface ScraperResponse {
  success: boolean
  results?: ScraperResult[]
  error?: string
}

/**
 * Run the Python scraper
 */
export async function runPythonScraper(
  hotelUrl: string,
  daysForward: number = 60,
  roomTypes: string[] = ["room_only", "with_breakfast"],
): Promise<ScraperResponse> {
  return new Promise((resolve, reject) => {
    const scraperPath = path.join(process.cwd(), "scraper_v5.py")

    // Spawn Python process
    const pythonProcess = spawn("python3", [
      scraperPath,
      hotelUrl,
      daysForward.toString(),
      JSON.stringify(roomTypes),
    ])

    let stdout = ""
    let stderr = ""

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString()
    })

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString()
      // Log stderr but continue (it contains logging info)
      console.log("[Scraper Log]", data.toString())
    })

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout) as ScraperResponse
          resolve(result)
        } catch (e) {
          reject(new Error(`Failed to parse scraper output: ${stdout}`))
        }
      } else {
        reject(new Error(`Scraper failed with code ${code}: ${stderr}`))
      }
    })

    pythonProcess.on("error", (err) => {
      reject(new Error(`Failed to start scraper: ${err.message}`))
    })

    // Timeout after 10 minutes
    setTimeout(() => {
      pythonProcess.kill()
      reject(new Error("Scraper timeout after 10 minutes"))
    }, 10 * 60 * 1000)
  })
}

/**
 * Simulate prices as fallback (for demo/testing)
 */
export function simulateCompetitorPrices(
  basePrice: number,
  date: Date,
  starRating: number = 3,
): { bookingPrice: number; expediaPrice: number; avgPrice: number } {
  const dayOfWeek = date.getDay()
  const month = date.getMonth()
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6
  const isHighSeason = month === 6 || month === 7 || month === 11

  let multiplier = 1.0
  if (isHighSeason && isWeekend) multiplier = 1.35
  else if (isHighSeason) multiplier = 1.2
  else if (isWeekend) multiplier = 1.15

  const starVariance = 0.85 + (starRating - 3) * 0.1
  const randomFactor = 0.92 + Math.random() * 0.16

  const baseCalculatedPrice = basePrice * starVariance * multiplier * randomFactor

  const bookingPrice = Math.round(baseCalculatedPrice * 0.98)
  const expediaPrice = Math.round(baseCalculatedPrice * 1.02)
  const avgPrice = Math.round((bookingPrice + expediaPrice) / 2)

  return { bookingPrice, expediaPrice, avgPrice }
}
