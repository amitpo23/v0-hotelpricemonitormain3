import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const SUPABASE_URL = "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I"

const COLUMN_MAPPINGS: Record<string, string[]> = {
  guest_name: [
    "שם אורח",
    "שם האורח",
    "שם לקוח",
    "שם הלקוח",
    "אורח",
    "לקוח",
    "שם מלא",
    "שם",
    "guest",
    "guest name",
    "customer",
    "customer name",
    "name",
    "full name",
    "client",
    "client name",
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
    "from date",
    "תאריך התחלה",
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
    "to date",
    "תאריך סיום",
  ],
  room_type: [
    "סוג חדר",
    "סוג",
    "קטגוריה",
    "חדר סוג",
    "טיפוס חדר",
    "חדר",
    "room type",
    "type",
    "category",
    "room category",
    "room",
    "unit type",
    "יחידה",
  ],
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
    "הכנסה",
    "total",
    "total price",
    "amount",
    "price",
    "revenue",
    "sum",
    "grand total",
    "סכום סופי",
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
    "platform",
    "פלטפורמה",
  ],
  status: ["סטטוס", "מצב", "סטאטוס", "status", "state", "booking status", "מצב הזמנה"],
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
    "created at",
    "נוצר בתאריך",
  ],
}

function normalizeColumnName(name: string): string {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .replace(/['"״׳]/g, "") // Remove quotes
}

function findColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}

  console.log("[v0] Headers found:", headers)

  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header)

    for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
      if (mapping[field] !== undefined) continue

      for (const alias of aliases) {
        const normalizedAlias = normalizeColumnName(alias)
        if (normalized === normalizedAlias || normalized.includes(normalizedAlias)) {
          mapping[field] = index
          console.log(`[v0] Mapped "${header}" -> ${field} (index ${index})`)
          break
        }
      }
    }
  })

  console.log("[v0] Final column mapping:", mapping)
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

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = strValue.split(/[/.-]/)
  if (parts.length === 3) {
    let [d, m, y] = parts

    // If first part is 4 digits, it's YYYY-MM-DD
    if (d.length === 4) {
      ;[y, m, d] = parts
    }

    const year = y.length === 2 ? `20${y}` : y
    const parsed = new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0]
    }
  }

  console.log(`[v0] Could not parse date: "${value}"`)
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

async function supabaseFetch(path: string, options: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers,
    },
  })
  return response
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const hotelId = formData.get("hotelId") as string

    console.log("[v0] Starting import for hotel:", hotelId)

    if (!file || !hotelId) {
      return NextResponse.json({ error: "Missing file or hotel ID" }, { status: 400 })
    }

    // Parse Excel file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

    console.log("[v0] Total rows in file:", rawData.length)

    if (rawData.length < 2) {
      return NextResponse.json({ error: "הקובץ ריק או חסרות שורות נתונים" }, { status: 400 })
    }

    const headers = rawData[0].map((h) => String(h || ""))
    const columnMap = findColumnMapping(headers)

    if (columnMap.check_in_date === undefined) {
      console.log("[v0] check_in_date not found in mapping, searching for date columns...")
      // Find first column with date-like values
      for (let i = 0; i < headers.length; i++) {
        const testValue = rawData[1]?.[i]
        if (parseDate(testValue)) {
          columnMap.check_in_date = i
          console.log(`[v0] Found date in column ${i}: ${headers[i]}`)
          break
        }
      }
    }

    if (columnMap.check_out_date === undefined && columnMap.check_in_date !== undefined) {
      // Assume checkout is the next column after checkin
      const nextCol = columnMap.check_in_date + 1
      if (nextCol < headers.length && parseDate(rawData[1]?.[nextCol])) {
        columnMap.check_out_date = nextCol
        console.log(`[v0] Assuming checkout is column ${nextCol}: ${headers[nextCol]}`)
      }
    }

    if (columnMap.check_in_date === undefined || columnMap.check_out_date === undefined) {
      return NextResponse.json(
        {
          error: `לא נמצאו עמודות תאריך. עמודות שנמצאו: ${headers.join(", ")}`,
          headers: headers,
          mapping: columnMap,
        },
        { status: 400 },
      )
    }

    // Get existing bookings to avoid duplicates
    const existingRes = await supabaseFetch(
      `/bookings?hotel_id=eq.${hotelId}&select=guest_name,check_in_date,check_out_date,total_price`,
    )
    const existingBookings = existingRes.ok ? await existingRes.json() : []

    const existingSet = new Set(
      existingBookings.map((b: any) => `${b.guest_name}|${b.check_in_date}|${b.check_out_date}|${b.total_price}`),
    )

    // Parse rows
    const bookingsToInsert: any[] = []
    let skipped = 0
    let parseErrors = 0

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || row.length === 0 || row.every((cell) => !cell)) continue

      const getValue = (field: string) => {
        const idx = columnMap[field]
        return idx !== undefined ? row[idx] : null
      }

      const checkIn = parseDate(getValue("check_in_date"))
      const checkOut = parseDate(getValue("check_out_date"))

      if (!checkIn || !checkOut) {
        parseErrors++
        if (i < 5) {
          // Log first few errors
          console.log(
            `[v0] Row ${i} parse error - checkIn: ${getValue("check_in_date")} -> ${checkIn}, checkOut: ${getValue("check_out_date")} -> ${checkOut}`,
          )
        }
        continue
      }

      const guestName = String(getValue("guest_name") || `אורח ${i}`).trim()
      const totalPrice = parseNumber(getValue("total_price"))
      const status = parseStatus(getValue("status"))

      if (status === "cancelled") {
        skipped++
        continue
      }

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

    console.log(
      `[v0] Parsed ${bookingsToInsert.length} valid bookings, ${skipped} skipped (duplicates/cancelled), ${parseErrors} parse errors`,
    )

    // Insert bookings in batches
    let imported = 0

    if (bookingsToInsert.length > 0) {
      // Insert in batches of 100
      const batchSize = 100
      for (let i = 0; i < bookingsToInsert.length; i += batchSize) {
        const batch = bookingsToInsert.slice(i, i + batchSize)
        const insertRes = await supabaseFetch("/bookings", {
          method: "POST",
          body: JSON.stringify(batch),
        })

        if (insertRes.ok) {
          imported += batch.length
        } else {
          const errorText = await insertRes.text()
          console.error("[v0] Insert error:", errorText)
        }
      }
    }

    console.log(`[v0] Import complete: ${imported} imported`)

    return NextResponse.json({
      success: true,
      imported,
      failed: skipped + parseErrors,
      total: rawData.length - 1,
      debug: {
        headers,
        mapping: columnMap,
        parseErrors,
        skipped,
      },
    })
  } catch (error) {
    console.error("[v0] PMS import error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "שגיאה בייבוא הקובץ" }, { status: 500 })
  }
}
