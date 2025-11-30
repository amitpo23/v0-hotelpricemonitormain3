import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

const SUPABASE_URL = "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I"

const COLUMN_MAPPINGS: Record<string, string[]> = {
  check_in_date: [
    "תאריך כניסה",
    "כניסה",
    "הגעה",
    "תאריך הגעה",
    "מתאריך",
    "צ'ק אין",
    "check in",
    "checkin",
    "check-in",
    "arrival",
    "arrival date",
    "from date",
    "start date",
  ],
  check_out_date: [
    "תאריך יציאה",
    "יציאה",
    "עזיבה",
    "תאריך עזיבה",
    "עד תאריך",
    "צ'ק אאוט",
    "check out",
    "checkout",
    "check-out",
    "departure",
    "departure date",
    "to date",
    "end date",
  ],
  guest_name: [
    "שם אורח",
    "שם האורח",
    "שם לקוח",
    "אורח",
    "לקוח",
    "שם מלא",
    "guest name",
    "guest",
    "customer name",
    "customer",
    "name",
  ],
  room_type: ["סוג חדר", "סוג", "קטגוריה", "חדר", "יחידה", "room type", "type", "room", "category"],
  total_price: [
    'סה"כ',
    "סה״כ",
    "סהכ",
    "סכום",
    "מחיר כולל",
    "סכום כולל",
    "הכנסה",
    "total",
    "total price",
    "amount",
    "price",
    "revenue",
  ],
  booking_source: ["מקור הזמנה", "מקור", "ערוץ", "source", "channel", "booking source", "ota"],
  status: ["סטטוס", "מצב", "status", "state"],
  booking_date: ["תאריך הזמנה", "תאריך ההזמנה", "נוצר בתאריך", "booking date", "reservation date", "created"],
}

function normalizeColumnName(name: string): string {
  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .replace(/['"״׳]/g, "")
}

function findColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {}
  const usedColumns = new Set<number>() // Track which columns are already used

  console.log("[v0] Headers found:", headers)

  // First pass: exact matches only
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    for (let index = 0; index < headers.length; index++) {
      if (usedColumns.has(index)) continue // Skip already used columns

      const header = headers[index]
      const normalized = normalizeColumnName(header)

      for (const alias of aliases) {
        const normalizedAlias = normalizeColumnName(alias)
        if (normalized === normalizedAlias) {
          mapping[field] = index
          usedColumns.add(index)
          console.log(`[v0] Exact match: "${header}" -> ${field} (column ${index})`)
          break
        }
      }
      if (mapping[field] !== undefined) break
    }
  }

  // Second pass: partial matches for fields not yet mapped
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    if (mapping[field] !== undefined) continue // Already mapped

    for (let index = 0; index < headers.length; index++) {
      if (usedColumns.has(index)) continue // Skip already used columns

      const header = headers[index]
      const normalized = normalizeColumnName(header)

      for (const alias of aliases) {
        const normalizedAlias = normalizeColumnName(alias)
        if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
          mapping[field] = index
          usedColumns.add(index)
          console.log(`[v0] Partial match: "${header}" -> ${field} (column ${index})`)
          break
        }
      }
      if (mapping[field] !== undefined) break
    }
  }

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
  if (!strValue) return null

  // Try ISO format first
  const isoDate = new Date(strValue)
  if (!isNaN(isoDate.getTime()) && strValue.includes("-")) {
    return isoDate.toISOString().split("T")[0]
  }

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = strValue.split(/[/.-]/)
  if (parts.length === 3) {
    let [d, m, y] = parts.map((p) => p.trim())

    // If first part is 4 digits, it's YYYY-MM-DD
    if (d.length === 4) {
      ;[y, m, d] = parts.map((p) => p.trim())
    }

    const year = y.length === 2 ? `20${y}` : y
    const month = m.padStart(2, "0")
    const day = d.padStart(2, "0")

    const parsed = new Date(`${year}-${month}-${day}`)
    if (!isNaN(parsed.getTime())) {
      return `${year}-${month}-${day}`
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

    // Find header row (first row with content)
    let headerRowIndex = 0
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i]
      if (row && row.some((cell) => cell && String(cell).length > 0)) {
        headerRowIndex = i
        break
      }
    }

    const headers = rawData[headerRowIndex].map((h) => String(h || "").trim())
    const columnMap = findColumnMapping(headers)

    if (columnMap.check_in_date === undefined || columnMap.check_out_date === undefined) {
      console.log("[v0] Date columns not found by name, searching by content...")

      const dateColumns: number[] = []
      const firstDataRow = rawData[headerRowIndex + 1]

      if (firstDataRow) {
        for (let i = 0; i < firstDataRow.length; i++) {
          if (parseDate(firstDataRow[i])) {
            dateColumns.push(i)
          }
        }
      }

      console.log("[v0] Found date columns by content:", dateColumns)

      if (dateColumns.length >= 2) {
        if (columnMap.check_in_date === undefined) {
          columnMap.check_in_date = dateColumns[0]
          console.log(`[v0] Auto-assigned check_in_date to column ${dateColumns[0]}`)
        }
        if (columnMap.check_out_date === undefined) {
          columnMap.check_out_date = dateColumns[1]
          console.log(`[v0] Auto-assigned check_out_date to column ${dateColumns[1]}`)
        }
      }
    }

    // Validate required fields
    if (columnMap.check_in_date === undefined || columnMap.check_out_date === undefined) {
      return NextResponse.json(
        {
          error: `לא נמצאו עמודות תאריך. עמודות שנמצאו: ${headers.join(", ")}`,
          headers,
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

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i]
      if (!row || row.length === 0 || row.every((cell) => !cell)) continue

      const getValue = (field: string) => {
        const idx = columnMap[field]
        return idx !== undefined ? row[idx] : null
      }

      const checkInRaw = getValue("check_in_date")
      const checkOutRaw = getValue("check_out_date")
      const checkIn = parseDate(checkInRaw)
      const checkOut = parseDate(checkOutRaw)

      if (!checkIn || !checkOut) {
        parseErrors++
        if (parseErrors <= 3) {
          console.log(`[v0] Row ${i} parse error:`, {
            checkInRaw,
            checkIn,
            checkOutRaw,
            checkOut,
            row: row.slice(0, 10),
          })
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
      `[v0] Parsed ${bookingsToInsert.length} valid bookings, ${skipped} skipped, ${parseErrors} parse errors`,
    )

    // Insert bookings in batches
    let imported = 0

    if (bookingsToInsert.length > 0) {
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
      total: rawData.length - 1 - headerRowIndex,
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
