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

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
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
  if (value === null || value === undefined || value === "") return null

  // Excel serial date number
  if (typeof value === "number" && value > 0) {
    const date = new Date((value - 25569) * 86400 * 1000)
    if (!isNaN(date.getTime()) && date.getFullYear() > 1990 && date.getFullYear() < 2100) {
      return date.toISOString().split("T")[0]
    }
  }

  // JS Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split("T")[0]
  }

  const strValue = String(value).trim()
  if (!strValue || strValue === "0" || strValue === "null" || strValue === "undefined") return null

  const monthNameMatch = strValue.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/)
  if (monthNameMatch) {
    const day = Number.parseInt(monthNameMatch[1])
    const monthName = monthNameMatch[2].toLowerCase()
    const year = Number.parseInt(monthNameMatch[3])
    const month = MONTH_NAMES[monthName]

    if (month && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    }
  }

  // Try native Date parsing for ISO formats (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  if (strValue.match(/^\d{4}-\d{2}-\d{2}/)) {
    const parsed = new Date(strValue)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split("T")[0]
    }
  }

  // Split by common delimiters
  const parts = strValue.split(/[/.\-\s]+/).filter((p) => p.length > 0)

  if (parts.length >= 3) {
    let day: string, month: string, year: string

    // Check if first part looks like a year (4 digits or starts with 19/20)
    if (parts[0].length === 4 || parts[0].startsWith("19") || parts[0].startsWith("20")) {
      year = parts[0]
      month = parts[1]
      day = parts[2]
    } else {
      day = parts[0]
      month = parts[1]
      year = parts[2]
    }

    // Handle 2-digit year
    if (year.length === 2) {
      year = `20${year}`
    }

    const monthNum = MONTH_NAMES[month.toLowerCase()]
    if (monthNum) {
      month = String(monthNum)
    }

    const y = Number.parseInt(year)
    const m = Number.parseInt(month)
    const d = Number.parseInt(day)

    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    }
  }

  // Last resort: try native Date parsing
  const lastTry = new Date(strValue)
  if (!isNaN(lastTry.getTime()) && lastTry.getFullYear() > 1990) {
    return lastTry.toISOString().split("T")[0]
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

    // Parse Excel file with cellDates option
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true, dateNF: "yyyy-mm-dd" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "yyyy-mm-dd" }) as any[][]

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

    console.log("[v0] First data row:", rawData[headerRowIndex + 1])
    console.log("[v0] Column map:", columnMap)

    if (columnMap.check_in_date === undefined || columnMap.check_out_date === undefined) {
      console.log("[v0] Date columns not found by name, searching by content...")

      const dateColumns: number[] = []
      // Check first 5 data rows
      for (let rowIdx = headerRowIndex + 1; rowIdx < Math.min(headerRowIndex + 6, rawData.length); rowIdx++) {
        const testRow = rawData[rowIdx]
        if (!testRow) continue

        for (let i = 0; i < testRow.length; i++) {
          if (dateColumns.includes(i)) continue
          const parsed = parseDate(testRow[i])
          if (parsed) {
            dateColumns.push(i)
            console.log(`[v0] Found date in column ${i}: ${testRow[i]} -> ${parsed}`)
          }
        }
      }

      // Sort and assign
      dateColumns.sort((a, b) => a - b)
      console.log("[v0] Date columns found:", dateColumns)

      if (dateColumns.length >= 2) {
        if (columnMap.check_in_date === undefined) {
          columnMap.check_in_date = dateColumns[0]
        }
        if (columnMap.check_out_date === undefined) {
          columnMap.check_out_date = dateColumns[1]
        }
      }
    }

    if (columnMap.check_in_date === undefined || columnMap.check_out_date === undefined) {
      const firstRow = rawData[headerRowIndex + 1]
      const errorSample = firstRow ? firstRow.map((v, i) => `[${i}]=${v}`).join(", ") : "no data"

      return NextResponse.json(
        {
          error: `לא נמצאו עמודות תאריך`,
          headers,
          mapping: columnMap,
          firstRowSample: errorSample,
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
    const errorSamples: string[] = []

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
        if (errorSamples.length < 3) {
          errorSamples.push(`Row ${i}: checkIn=[${checkInRaw}]->${checkIn}, checkOut=[${checkOutRaw}]->${checkOut}`)
        }
        continue
      }

      const guestName = String(getValue("guest_name") || `אורח ${i}`).trim()
      const totalPrice = parseNumber(getValue("total_price"))
      const status = parseStatus(getValue("status"))

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
    if (errorSamples.length > 0) {
      console.log("[v0] Error samples:", errorSamples)
    }

    // Insert bookings in batches
    let imported = 0
    const insertErrors: string[] = []

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
          insertErrors.push(errorText)
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
        errorSamples,
        insertErrors: insertErrors.slice(0, 2),
      },
    })
  } catch (error) {
    console.error("[v0] PMS import error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "שגיאה בייבוא הקובץ" }, { status: 500 })
  }
}
