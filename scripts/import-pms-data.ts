// Script to import PMS data from CSV
// Run this script to bulk import all booking data

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const HOTEL_ID = "716e1e8f-3537-4f67-875d-de3a89642175" // scarlet hotel

// Parse CSV data - this is the raw data from the PMS
const csvData = `Booking ID,Booking date,Status,Group price,Currency,Channel,Reference,Customer name,Customer details,Group,Pax,Pax nationality,People count,Checkin date,Checkout date,Item name,Product quantity,Item price,Item price currency,Payment status,Cancellation policy,Late cancel date,Cancel reason
1148176,29 Nov 2025 22:23:06,Confirmed,1297.88,ILS,Channels / AirBnB,HMKWYMYJ79,Lin Löwe,", , ",Group 1,Lin Löwe (35 y.o.),,1,5 Jan 2026,10 Jan 2026,Room - Classic Double Room,5.00,1297.88,ILS,0 (0%),"From 30 Nov 2025 00:00:00 - 0.00 Percent,From 03 Jan 2026 00:00:00 - 100.00 Percent,From 05 Jan 2026 00:00:00 - 100.00 Percent",29 Nov 2025,
1148175,29 Nov 2025 22:21:24,Confirmed,4682.44,ILS,Channels / Booking.com,5267118629,"Annette a Wald Gärdenfors","Sweden, ., ",Group 1,"Annette a Wald Gärdenfors (35 y.o.),Annette Wald Gärdenfors (35 y.o.)",Sweden,2,15 Apr 2026,22 Apr 2026,Room - Classic Double Room,7.00,4682.44,ILS,0 (0%),"From 30 Nov 2025 00:00:00 - 0.00 Percent,From 13 Apr 2026 00:00:00 - 100.00 Percent,From 15 Apr 2026 00:00:00 - 100.00 Percent",29 Nov 2025,`

// Function to parse date from PMS format
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null

  // Format: "29 Nov 2025" or "29 Nov 2025 22:23:06"
  const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  }

  const parts = dateStr.trim().split(" ")
  if (parts.length >= 3) {
    const day = parts[0].padStart(2, "0")
    const month = months[parts[1]] || "01"
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  return null
}

// Function to extract channel name
function extractChannel(channel: string): string {
  if (channel.includes("Booking.com")) return "Booking.com"
  if (channel.includes("AirBnB")) return "AirBnB"
  if (channel.includes("Expedia")) return "Expedia"
  if (channel.includes("Direct") || channel.includes("Yehuda")) return "Direct"
  return "Other"
}

// Function to parse status
function parseStatus(status: string): string {
  const s = status.toLowerCase()
  if (s.includes("cancel")) return "cancelled"
  if (s.includes("confirm")) return "confirmed"
  return "pending"
}

async function importData() {
  console.log("Starting import...")

  // The full data should be fetched from the CSV file
  // For now we'll use the sample data above

  const lines = csvData.split("\n").slice(1) // Skip header
  const bookings: any[] = []

  for (const line of lines) {
    if (!line.trim()) continue

    // Parse CSV line (handling quoted fields)
    const fields =
      line
        .match(/(?:^|,)("(?:[^"]*(?:""[^"]*)*)"|[^,]*)/g)
        ?.map((f) => f.replace(/^,?"?|"?$/g, "").replace(/""/g, '"')) || []

    if (fields.length < 15) continue

    const booking = {
      hotel_id: HOTEL_ID,
      guest_name: fields[7] || "Unknown",
      check_in_date: parseDate(fields[13]),
      check_out_date: parseDate(fields[14]),
      total_price: Number.parseFloat(fields[3]) || 0,
      booking_source: extractChannel(fields[5]),
      status: parseStatus(fields[2]),
      booking_date: parseDate(fields[1]),
    }

    if (booking.check_in_date && booking.check_out_date) {
      bookings.push(booking)
    }
  }

  console.log(`Parsed ${bookings.length} bookings`)

  // Insert in batches
  const batchSize = 100
  for (let i = 0; i < bookings.length; i += batchSize) {
    const batch = bookings.slice(i, i + batchSize)
    const { error } = await supabase.from("bookings").insert(batch)
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
    } else {
      console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`)
    }
  }

  console.log("Import complete!")
}

importData()
