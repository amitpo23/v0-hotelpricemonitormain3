import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const COLUMN_MAPPINGS: Record<string, string[]> = {
  guest_name: [
    "שם אורח",
    "שם האורח",
    "שם לקוח",
    "שם הלקוח",
    "אורח",
    "לקוח",
    "שם מלא",
    "guest",
    "guest name",
    "customer",
    "customer name",
    "name",
    "full name",
  ],
  check_in_date: [
    "תאריך כניסה",
    "כניסה",
    "הגעה",
    "תאריך הגעה",
    "מתאריך",
    "תחילה",
    "צ'ק אין",
    "check in",
    "checkin",
    "check-in",
    "arrival",
    "arrival date",
    "from",
    "start date",
  ],
  check_out_date: [
    "תאריך יציאה",
    "יציאה",
    "עזיבה",
    "תאריך עזיבה",
    "עד תאריך",
    "סיום",
    "צ'ק אאוט",
    "check out",
    "checkout",
    "check-out",
    "departure",
    "departure date",
    "to",
    "end date",
  ],
  room_type: ["סוג חדר", "סוג", "קטגוריה", "חדר סוג", "טיפוס חדר", "room type", "type", "category", "room category"],
  total_price: [
    'סה"כ',
    "סה״כ",
    "סהכ",
    "סכום",
    "מחיר",
    "תשלום",
    'סה"כ לתשלום',
    "סכום כולל",
    "מחיר כולל",
    "total",
    "total price",
    "amount",
    "price",
    "revenue",
    "sum",
  ],
  booking_source: [
    "מקור",
    "מקור הזמנה",
    "ערוץ",
    "אתר",
    "מקור ההזמנה",
    "ערוץ הזמנה",
    "source",
    "booking source",
    "channel",
    "ota",
    "origin",
  ],
  status: ["סטטוס", "מצב", "סטאטוס", "status", "state", "booking status"],
  booking_date: [
    "תאריך הזמנה",
    "תאריך ההזמנה",
    "נוצר",
    "הוזמן",
    "תאריך יצירה",
    "booking date",
    "reservation date",
    "created",
    "booked on",
  ],
  nights: ["לילות", "מספר לילות", "כמות לילות", "nights", "num nights", "stay length"],
  nightly_rate: ["מחיר ללילה", "תעריף", "מחיר לילה", "ללילה", "rate", "nightly rate", "night rate", "adr"],
}

function normalizeColumnName(name: string): string {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
}

function findColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}

  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header)

    for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      if (mapping[field] !== undefined) continue

      for (const alias of aliases) {
        if (normalized === normalizeColumnName(alias) || normalized.includes(normalizeColumnName(alias))) {
          mapping[field] = index
          break
        }
      }
    }
  })

  return mapping
}

function parseDate(value: any): string | null {
  if (!value) return null

  // Excel serial date number
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0]
    }
  }

  if (value instanceof Date) {
    return value.toISOString().split("T")[0]
  }

  const strValue = String(value).trim()

  // Try ISO format first
  const isoDate = new Date(strValue)
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString().split("T")[0]
  }

  // Try DD/MM/YYYY or DD.MM.YYYY (common in Israel)
  const parts = strValue.split(/[/.-]/)
  if (parts.length === 3) {
    const [d, m, y] = parts
    const year = y.length === 2 ? `20${y}` : y
    const parsed = new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0]
    }
  }

  return null
}

function parseNumber(value: any): number {
  if (!value) return 0
  if (typeof value === "number") return value
  const cleaned = String(value).replace(/[^\d.-]/g, "")
  return Number.parseFloat(cleaned) || 0
}

function parseStatus(status: any): string {
  if (!status) return "confirmed"
  const s = String(status).toLowerCase()
  if (s.includes("cancel") || s.includes("ביטול") || s.includes("מבוטל")) return "cancelled"
  if (s.includes("pending") || s.includes("ממתין") || s.includes("בהמתנה")) return "pending"
  if (s.includes("no show") || s.includes("לא הגיע")) return "no_show"
  return "confirmed"
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const hotelId = formData.get("hotelId") as string

    if (!file || !hotelId) {
      return NextResponse.json({ error: "Missing file or hotel ID" }, { status: 400 })
    }

    // Parse Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    if (rawData.length < 2) {
      return NextResponse.json({ error: "הקובץ ריק או חסרות שורות נתונים" }, { status: 400 })
    }

    // Get headers and find column mapping
    const headers = rawData[0].map((h) => String(h || ""))
    const columnMap = findColumnMapping(headers)

    console.log("[v0] Headers found:", headers)
    console.log("[v0] Column mapping:", columnMap)

    // Validate required columns
    if (columnMap.check_in_date === undefined || columnMap.check_out_date === undefined) {
      return NextResponse.json(
        {
          error: "לא נמצאו עמודות תאריך כניסה/יציאה. וודא שהקובץ מכיל עמודות: תאריך כניסה, תאריך יציאה",
        },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    // Get existing bookings to avoid duplicates
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("guest_name, check_in_date, check_out_date, total_price")
      .eq("hotel_id", hotelId)

    const existingSet = new Set(
      (existingBookings || []).map((b) => `${b.guest_name}|${b.check_in_date}|${b.check_out_date}|${b.total_price}`),
    )

    // Parse rows
    const bookingsToInsert: any[] = []
    let skipped = 0

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || row.length === 0) continue

      const getValue = (field: string) => {
        const idx = columnMap[field]
        return idx !== undefined ? row[idx] : null
      }

      const checkIn = parseDate(getValue("check_in_date"))
      const checkOut = parseDate(getValue("check_out_date"))

      if (!checkIn || !checkOut) continue

      const guestName = String(getValue("guest_name") || "אורח").trim()
      const totalPrice = parseNumber(getValue("total_price"))
      const status = parseStatus(getValue("status"))

      // Skip cancelled bookings
      if (status === "cancelled") {
        skipped++
        continue
      }

      // Check for duplicates
      const key = `${guestName}|${checkIn}|${checkOut}|${totalPrice}`
      if (existingSet.has(key)) {
        skipped++
        continue
      }
      existingSet.add(key)

      bookingsToInsert.push({
        hotel_id: hotelId,
        guest_name: guestName,
        check_in_date: checkIn,
        check_out_date: checkOut,
        room_type: String(getValue("room_type") || "Standard").trim(),
        total_price: totalPrice,
        booking_source: String(getValue("booking_source") || "PMS Import").trim(),
        status: status,
        created_at: new Date().toISOString(),
      })
    }

    console.log("[v0] Bookings to insert:", bookingsToInsert.length)
    console.log("[v0] Skipped (duplicates/cancelled):", skipped)

    // Insert bookings in batches
    let imported = 0
    const batchSize = 100

    for (let i = 0; i < bookingsToInsert.length; i += batchSize) {
      const batch = bookingsToInsert.slice(i, i + batchSize)
      const { error } = await supabase.from("bookings").insert(batch)

      if (error) {
        console.error("[v0] Insert error:", error)
      } else {
        imported += batch.length
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed: skipped,
      total: rawData.length - 1,
    })
  } catch (error) {
    console.error("[v0] PMS import error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "שגיאה בייבוא הקובץ" }, { status: 500 })
  }
}
