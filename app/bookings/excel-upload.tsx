"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  UploadIcon,
  FileSpreadsheetIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
  TrendingUpIcon,
  CalendarIcon,
  BedDoubleIcon,
  BarChart3Icon,
  RefreshCwIcon,
} from "lucide-react"

interface Hotel {
  id: string
  name: string
  total_rooms?: number
}

interface ParsedBooking {
  guest_name: string
  check_in_date: string
  check_out_date: string
  room_type: string
  room_number: string
  room_count: number
  nights: number
  nightly_rate: number
  total_price: number
  booking_source: string
  booking_date: string
  status: string
  confirmation_number?: string
  isValid: boolean
  errors: string[]
  isDuplicate?: boolean
}

interface ColumnMapping {
  guest_name: string
  check_in_date: string
  check_out_date: string
  room_type: string
  room_number: string
  room_count: string
  nights: string
  nightly_rate: string
  total_price: string
  booking_source: string
  booking_date: string
  status: string
  confirmation_number: string
}

interface ImportAnalytics {
  totalBookings: number
  totalRevenue: number
  totalRoomNights: number
  avgNightlyRate: number
  avgStayLength: number
  occupancyByMonth: Record<string, { roomNights: number; revenue: number; bookings: number }>
  bookingPace: Record<string, number>
  sourceBreakdown: Record<string, { count: number; revenue: number }>
  roomTypeBreakdown: Record<string, { count: number; revenue: number; avgRate: number }>
  newBookings: number
  duplicateBookings: number
}

const PMS_COLUMN_MAPPING: Record<string, keyof ColumnMapping> = {
  // Hebrew columns - exact matches from PMS
  "שם אורח": "guest_name",
  "שם האורח": "guest_name",
  "שם לקוח": "guest_name",
  אורח: "guest_name",
  לקוח: "guest_name",
  "תאריך כניסה": "check_in_date",
  כניסה: "check_in_date",
  מתאריך: "check_in_date",
  "תאריך הגעה": "check_in_date",
  "תאריך יציאה": "check_out_date",
  יציאה: "check_out_date",
  "עד תאריך": "check_out_date",
  "תאריך עזיבה": "check_out_date",
  "סוג חדר": "room_type",
  קטגוריה: "room_type",
  סוג: "room_type",
  חדר: "room_number",
  "מספר חדר": "room_number",
  "חדר מספר": "room_number",
  "כמות חדרים": "room_count",
  חדרים: "room_count",
  כמות: "room_count",
  "מספר לילות": "nights",
  לילות: "nights",
  ימים: "nights",
  "מחיר ללילה": "nightly_rate",
  תעריף: "nightly_rate",
  "מחיר לילה": "nightly_rate",
  ללילה: "nightly_rate",
  'סה"כ': "total_price",
  "סה״כ": "total_price",
  סהכ: "total_price",
  סכום: "total_price",
  מחיר: "total_price",
  תשלום: "total_price",
  'סה"כ לתשלום': "total_price",
  "מקור הזמנה": "booking_source",
  מקור: "booking_source",
  ערוץ: "booking_source",
  אתר: "booking_source",
  OTA: "booking_source",
  "תאריך הזמנה": "booking_date",
  "תאריך ביצוע": "booking_date",
  "נוצר בתאריך": "booking_date",
  סטטוס: "status",
  מצב: "status",
  "מספר הזמנה": "confirmation_number",
  "מספר אישור": "confirmation_number",
  אישור: "confirmation_number",
  // English columns
  "Guest Name": "guest_name",
  Guest: "guest_name",
  Customer: "guest_name",
  "Check In": "check_in_date",
  "Check-In": "check_in_date",
  Checkin: "check_in_date",
  Arrival: "check_in_date",
  "Check Out": "check_out_date",
  "Check-Out": "check_out_date",
  Checkout: "check_out_date",
  Departure: "check_out_date",
  "Room Type": "room_type",
  Category: "room_type",
  Room: "room_number",
  "Room No": "room_number",
  "Room Number": "room_number",
  Rooms: "room_count",
  Qty: "room_count",
  Nights: "nights",
  Rate: "nightly_rate",
  "Night Rate": "nightly_rate",
  ADR: "nightly_rate",
  Total: "total_price",
  Amount: "total_price",
  Revenue: "total_price",
  Price: "total_price",
  Source: "booking_source",
  Channel: "booking_source",
  "Booking Date": "booking_date",
  Created: "booking_date",
  Status: "status",
  Confirmation: "confirmation_number",
  "Confirmation Number": "confirmation_number",
}

export function ExcelUpload({ hotels }: { hotels: Hotel[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "done">("upload")
  const [selectedHotel, setSelectedHotel] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  const [parsedBookings, setParsedBookings] = useState<ParsedBooking[]>([])
  const [analytics, setAnalytics] = useState<ImportAnalytics | null>(null)
  const [existingBookings, setExistingBookings] = useState<Set<string>>(new Set())
  const [autoMappingSuccess, setAutoMappingSuccess] = useState(false)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    guest_name: "",
    check_in_date: "",
    check_out_date: "",
    room_type: "",
    room_number: "",
    room_count: "",
    nights: "",
    nightly_rate: "",
    total_price: "",
    booking_source: "",
    booking_date: "",
    status: "",
    confirmation_number: "",
  })
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; skipped: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedHotel) {
      loadExistingBookings(selectedHotel)
    }
  }, [selectedHotel])

  const loadExistingBookings = async (hotelId: string) => {
    try {
      const response = await fetch(`/api/bookings?hotel_id=${hotelId}`)
      if (response.ok) {
        const data = await response.json()
        const bookingKeys = new Set<string>()
        data.bookings?.forEach((b: any) => {
          // Create unique key from guest + check_in + check_out + total
          const key = `${b.guest_name?.toLowerCase()}_${b.check_in_date}_${b.check_out_date}_${b.total_price}`
          bookingKeys.add(key)
          // Also add by confirmation number if exists
          if (b.confirmation_number) {
            bookingKeys.add(`conf_${b.confirmation_number}`)
          }
        })
        setExistingBookings(bookingKeys)
      }
    } catch (error) {
      console.error("Error loading existing bookings:", error)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const response = await fetch("/api/bookings/parse-excel", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setHeaders(data.headers)
        setRawData(data.rows)

        const autoMapping = autoMapColumns(data.headers)
        setColumnMapping(autoMapping)

        // Check if we have all required fields mapped
        const requiredFields = ["check_in_date", "check_out_date", "total_price"]
        const mappedRequired = requiredFields.every((field) => autoMapping[field as keyof ColumnMapping])

        if (mappedRequired) {
          setAutoMappingSuccess(true)
          // Skip mapping step and go directly to preview
          applyMappingWithData(autoMapping, data.rows)
        } else {
          setAutoMappingSuccess(false)
          setStep("mapping")
        }
      } else {
        alert("Failed to parse Excel file")
      }
    } catch (error) {
      console.error("Error parsing file:", error)
      alert("Error parsing file")
    }
  }

  const autoMapColumns = (headers: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {
      guest_name: "",
      check_in_date: "",
      check_out_date: "",
      room_type: "",
      room_number: "",
      room_count: "",
      nights: "",
      nightly_rate: "",
      total_price: "",
      booking_source: "",
      booking_date: "",
      status: "",
      confirmation_number: "",
    }

    headers.forEach((header) => {
      const trimmedHeader = header.trim()

      // First try exact match from PMS mapping
      if (PMS_COLUMN_MAPPING[trimmedHeader]) {
        const field = PMS_COLUMN_MAPPING[trimmedHeader]
        if (!mapping[field]) {
          mapping[field] = header
        }
        return
      }

      // Try case-insensitive match
      const lowerHeader = trimmedHeader.toLowerCase()
      for (const [pmsColumn, field] of Object.entries(PMS_COLUMN_MAPPING)) {
        if (pmsColumn.toLowerCase() === lowerHeader) {
          if (!mapping[field]) {
            mapping[field] = header
          }
          return
        }
      }

      // Try partial match for common patterns
      for (const [pmsColumn, field] of Object.entries(PMS_COLUMN_MAPPING)) {
        if (
          trimmedHeader.includes(pmsColumn) ||
          pmsColumn.includes(trimmedHeader) ||
          lowerHeader.includes(pmsColumn.toLowerCase())
        ) {
          if (!mapping[field]) {
            mapping[field] = header
          }
          return
        }
      }
    })

    return mapping
  }

  const applyMappingWithData = (mapping: ColumnMapping, data: any[]) => {
    const bookings = processBookings(mapping, data)
    setParsedBookings(bookings)

    const validBookings = bookings.filter((b) => b.isValid)
    const analyticsData = calculateAnalytics(validBookings, bookings)
    setAnalytics(analyticsData)

    setStep("preview")
  }

  const applyMapping = () => {
    applyMappingWithData(columnMapping, rawData)
  }

  const processBookings = (mapping: ColumnMapping, data: any[]): ParsedBooking[] => {
    return data.map((row) => {
      const errors: string[] = []

      const checkIn = parseDate(row[mapping.check_in_date])
      const checkOut = parseDate(row[mapping.check_out_date])
      const bookingDate = parseDate(row[mapping.booking_date]) || new Date().toISOString().split("T")[0]
      const roomCount = Number.parseInt(row[mapping.room_count]) || 1
      const nightsFromColumn = Number.parseInt(row[mapping.nights]) || 0
      const nightlyRate = parseNumber(row[mapping.nightly_rate])
      const totalPrice = parseNumber(row[mapping.total_price])
      const guestName = row[mapping.guest_name] || "אורח"
      const confirmationNumber = row[mapping.confirmation_number] || ""

      const calculatedNights = nightsFromColumn || calculateNights(checkIn, checkOut)
      const calculatedRate =
        nightlyRate || (totalPrice && calculatedNights ? totalPrice / calculatedNights / roomCount : 0)
      const calculatedTotal = totalPrice || nightlyRate * calculatedNights * roomCount

      if (!checkIn) errors.push("תאריך כניסה חסר")
      if (!checkOut) errors.push("תאריך יציאה חסר")
      if (checkIn && checkOut && new Date(checkIn) >= new Date(checkOut)) {
        errors.push("תאריך יציאה חייב להיות אחרי תאריך כניסה")
      }
      if (calculatedTotal <= 0 && calculatedRate <= 0) errors.push("מחיר חסר")

      const bookingKey = `${guestName.toLowerCase()}_${checkIn}_${checkOut}_${calculatedTotal}`
      const isDuplicate =
        existingBookings.has(bookingKey) || (confirmationNumber && existingBookings.has(`conf_${confirmationNumber}`))

      return {
        guest_name: guestName,
        check_in_date: checkIn || "",
        check_out_date: checkOut || "",
        room_type: row[mapping.room_type] || "Standard",
        room_number: row[mapping.room_number] || "",
        room_count: roomCount,
        nights: calculatedNights,
        nightly_rate: calculatedRate,
        total_price: calculatedTotal,
        booking_source: row[mapping.booking_source] || "PMS Import",
        booking_date: bookingDate,
        status: parseStatus(row[mapping.status]),
        confirmation_number: confirmationNumber,
        isValid: errors.length === 0,
        errors,
        isDuplicate,
      }
    })
  }

  const parseStatus = (status: any): string => {
    if (!status) return "confirmed"
    const s = String(status).toLowerCase()
    if (s.includes("cancel") || s.includes("ביטול") || s.includes("מבוטל")) return "cancelled"
    if (s.includes("pending") || s.includes("ממתין") || s.includes("בהמתנה")) return "pending"
    if (s.includes("confirm") || s.includes("מאושר") || s.includes("אושר")) return "confirmed"
    if (s.includes("no show") || s.includes("לא הגיע")) return "no_show"
    return "confirmed"
  }

  const parseNumber = (value: any): number => {
    if (!value) return 0
    if (typeof value === "number") return value
    const cleaned = String(value).replace(/[^\d.-]/g, "")
    return Number.parseFloat(cleaned) || 0
  }

  const parseDate = (value: any): string => {
    if (!value) return ""

    if (typeof value === "number") {
      const date = new Date((value - 25569) * 86400 * 1000)
      return date.toISOString().split("T")[0]
    }

    if (value instanceof Date) {
      return value.toISOString().split("T")[0]
    }

    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0]
    }

    // Try DD/MM/YYYY format (common in Israel)
    const parts = String(value).split(/[/\-.]/)
    if (parts.length === 3) {
      const [d, m, y] = parts
      const year = y.length === 2 ? `20${y}` : y
      const parsed = new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`)
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split("T")[0]
      }
    }

    return ""
  }

  const calculateNights = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 1
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const calculateAnalytics = (validBookings: ParsedBooking[], allBookings: ParsedBooking[]): ImportAnalytics => {
    const newBookings = validBookings.filter((b) => !b.isDuplicate)
    const duplicates = allBookings.filter((b) => b.isDuplicate)

    const analytics: ImportAnalytics = {
      totalBookings: validBookings.length,
      totalRevenue: 0,
      totalRoomNights: 0,
      avgNightlyRate: 0,
      avgStayLength: 0,
      occupancyByMonth: {},
      bookingPace: {},
      sourceBreakdown: {},
      roomTypeBreakdown: {},
      newBookings: newBookings.length,
      duplicateBookings: duplicates.length,
    }

    newBookings.forEach((booking) => {
      analytics.totalRevenue += booking.total_price
      analytics.totalRoomNights += booking.nights * booking.room_count

      // By source
      if (!analytics.sourceBreakdown[booking.booking_source]) {
        analytics.sourceBreakdown[booking.booking_source] = { count: 0, revenue: 0 }
      }
      analytics.sourceBreakdown[booking.booking_source].count++
      analytics.sourceBreakdown[booking.booking_source].revenue += booking.total_price

      // By room type
      if (!analytics.roomTypeBreakdown[booking.room_type]) {
        analytics.roomTypeBreakdown[booking.room_type] = { count: 0, revenue: 0, avgRate: 0 }
      }
      analytics.roomTypeBreakdown[booking.room_type].count++
      analytics.roomTypeBreakdown[booking.room_type].revenue += booking.total_price

      // By month (for occupancy)
      const month = booking.check_in_date.substring(0, 7)
      if (!analytics.occupancyByMonth[month]) {
        analytics.occupancyByMonth[month] = { roomNights: 0, revenue: 0, bookings: 0 }
      }
      analytics.occupancyByMonth[month].roomNights += booking.nights * booking.room_count
      analytics.occupancyByMonth[month].revenue += booking.total_price
      analytics.occupancyByMonth[month].bookings++

      // Booking pace
      if (!analytics.bookingPace[booking.booking_date]) {
        analytics.bookingPace[booking.booking_date] = 0
      }
      analytics.bookingPace[booking.booking_date]++
    })

    if (newBookings.length > 0) {
      analytics.avgNightlyRate = analytics.totalRevenue / analytics.totalRoomNights
      analytics.avgStayLength = analytics.totalRoomNights / newBookings.length

      // Calculate avg rate per room type
      for (const type of Object.keys(analytics.roomTypeBreakdown)) {
        const data = analytics.roomTypeBreakdown[type]
        data.avgRate = data.revenue / data.count
      }
    }

    return analytics
  }

  const handleImport = async () => {
    if (!selectedHotel) return

    setImporting(true)
    setStep("importing")

    const newBookings = parsedBookings.filter((b) => b.isValid && !b.isDuplicate)

    try {
      const response = await fetch("/api/bookings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_id: selectedHotel,
          bookings: newBookings,
          analytics,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setImportResult({
          success: result.imported || newBookings.length,
          failed: result.failed || 0,
          skipped: parsedBookings.filter((b) => b.isDuplicate).length,
        })
        setStep("done")
      } else {
        alert("Failed to import bookings")
        setStep("preview")
      }
    } catch (error) {
      console.error("Error importing:", error)
      alert("Error importing bookings")
      setStep("preview")
    } finally {
      setImporting(false)
    }
  }

  const resetDialog = () => {
    setStep("upload")
    setFile(null)
    setHeaders([])
    setRawData([])
    setParsedBookings([])
    setAnalytics(null)
    setImportResult(null)
    setAutoMappingSuccess(false)
    setColumnMapping({
      guest_name: "",
      check_in_date: "",
      check_out_date: "",
      room_type: "",
      room_number: "",
      room_count: "",
      nights: "",
      nightly_rate: "",
      total_price: "",
      booking_source: "",
      booking_date: "",
      status: "",
      confirmation_number: "",
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const mappingFields: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
    { key: "guest_name", label: "שם אורח", required: false },
    { key: "check_in_date", label: "תאריך כניסה", required: true },
    { key: "check_out_date", label: "תאריך יציאה", required: true },
    { key: "room_type", label: "סוג חדר", required: false },
    { key: "room_number", label: "מספר חדר", required: false },
    { key: "room_count", label: "כמות חדרים", required: false },
    { key: "nights", label: "מספר לילות", required: false },
    { key: "nightly_rate", label: "מחיר ללילה", required: false },
    { key: "total_price", label: 'סה"כ', required: true },
    { key: "booking_source", label: "מקור הזמנה", required: false },
    { key: "booking_date", label: "תאריך הזמנה", required: false },
    { key: "status", label: "סטטוס", required: false },
    { key: "confirmation_number", label: "מספר אישור", required: false },
  ]

  const validCount = parsedBookings.filter((b) => b.isValid && !b.isDuplicate).length
  const invalidCount = parsedBookings.filter((b) => !b.isValid).length
  const duplicateCount = parsedBookings.filter((b) => b.isDuplicate).length

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent">
          <FileSpreadsheetIcon className="w-4 h-4 mr-2" />
          Import from PMS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheetIcon className="w-5 h-5 text-cyan-400" />
            ייבוא הזמנות ממערכת PMS
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            העלה קובץ אקסל עם נתוני הזמנות ממערכת ה-PMS שלך
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 my-4">
          {[
            { key: "upload", num: 1 },
            { key: "mapping", num: 2 },
            { key: "preview", num: 3 },
            { key: "done", num: 4 },
          ].map(({ key, num }) => (
            <div key={key} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === key || (key === "mapping" && autoMappingSuccess && step === "preview")
                    ? "bg-cyan-500 text-white"
                    : step === "importing" || step === "done"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "bg-slate-700 text-slate-400"
                }`}
              >
                {(step === "done" && key !== "done") ||
                (key === "upload" && step !== "upload") ||
                (key === "mapping" && (step === "preview" || step === "importing" || step === "done")) ||
                (key === "preview" && (step === "importing" || step === "done")) ? (
                  <CheckCircleIcon className="w-4 h-4" />
                ) : (
                  num
                )}
              </div>
              {num < 4 && <div className="w-12 h-0.5 bg-slate-700" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">בחר מלון</label>
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="בחר מלון" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id} className="text-white hover:bg-slate-700">
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                selectedHotel
                  ? "border-cyan-500/50 hover:border-cyan-500 cursor-pointer"
                  : "border-slate-600 opacity-50"
              }`}
              onClick={() => selectedHotel && fileInputRef.current?.click()}
            >
              <UploadIcon className="w-12 h-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-300 mb-2">גרור קובץ אקסל לכאן או לחץ לבחירה</p>
              <p className="text-slate-500 text-sm">תומך בפורמטים: .xlsx, .xls, .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={!selectedHotel}
              />
            </div>

            <Alert className="bg-slate-800/50 border-cyan-500/30">
              <RefreshCwIcon className="w-4 h-4 text-cyan-400" />
              <AlertDescription className="text-slate-300 mr-2">
                <strong className="text-cyan-400">עדכון יומי:</strong> המערכת מזהה אוטומטית הזמנות קיימות ומייבאת רק
                הזמנות חדשות. ניתן להעלות את אותו פורמט PMS מדי יום.
              </AlertDescription>
            </Alert>

            {file && (
              <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-lg">
                <FileSpreadsheetIcon className="w-5 h-5 text-green-400" />
                <span className="text-white">{file.name}</span>
                <Badge variant="secondary" className="ml-auto">
                  {(file.size / 1024).toFixed(1)} KB
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Column Mapping (only if auto-mapping failed) */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium text-white mb-2">מיפוי עמודות</h3>
              <p className="text-slate-400 text-sm">בחר איזה עמודה מתאימה לכל שדה. המערכת ניסתה לזהות אוטומטית.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {mappingFields.map(({ key, label, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {label} {required && <span className="text-red-400">*</span>}
                  </label>
                  <Select
                    value={columnMapping[key] || "__none__"}
                    onValueChange={(value) =>
                      setColumnMapping((prev) => ({ ...prev, [key]: value === "__none__" ? "" : value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="-- לא ממופה --" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="__none__" className="text-slate-400">
                        -- לא ממופה --
                      </SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header} className="text-white hover:bg-slate-700">
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => setStep("upload")} className="border-slate-600">
                חזרה
              </Button>
              <Button
                onClick={applyMapping}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={!columnMapping.check_in_date || !columnMapping.check_out_date || !columnMapping.total_price}
              >
                תצוגה מקדימה
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            {duplicateCount > 0 && (
              <Alert className="bg-yellow-500/10 border-yellow-500/30">
                <RefreshCwIcon className="w-4 h-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200 mr-2">
                  נמצאו <strong>{duplicateCount}</strong> הזמנות שכבר קיימות במערכת - הן לא ייובאו. יייובאו רק{" "}
                  <strong>{validCount}</strong> הזמנות חדשות.
                </AlertDescription>
              </Alert>
            )}

            {/* Analytics Summary */}
            {analytics && (
              <div className="grid grid-cols-4 gap-4 mb-4">
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-slate-400 text-xs">הזמנות חדשות</p>
                        <p className="text-xl font-bold text-white">{analytics.newBookings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUpIcon className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-slate-400 text-xs">הכנסות חדשות</p>
                        <p className="text-xl font-bold text-white">${analytics.totalRevenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BedDoubleIcon className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-slate-400 text-xs">לילות חדר</p>
                        <p className="text-xl font-bold text-white">{analytics.totalRoomNights}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BarChart3Icon className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="text-slate-400 text-xs">ADR ממוצע</p>
                        <p className="text-xl font-bold text-white">${analytics.avgNightlyRate.toFixed(0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Bookings Preview Table */}
            <div className="max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">סטטוס</TableHead>
                    <TableHead className="text-slate-300">אורח</TableHead>
                    <TableHead className="text-slate-300">כניסה</TableHead>
                    <TableHead className="text-slate-300">יציאה</TableHead>
                    <TableHead className="text-slate-300">לילות</TableHead>
                    <TableHead className="text-slate-300">סה"כ</TableHead>
                    <TableHead className="text-slate-300">מקור</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedBookings.slice(0, 20).map((booking, idx) => (
                    <TableRow
                      key={idx}
                      className={`border-slate-700 ${
                        booking.isDuplicate ? "opacity-50 bg-yellow-500/5" : booking.isValid ? "" : "bg-red-500/10"
                      }`}
                    >
                      <TableCell>
                        {booking.isDuplicate ? (
                          <Badge variant="outline" className="border-yellow-500 text-yellow-400 text-xs">
                            כפילות
                          </Badge>
                        ) : booking.isValid ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertCircleIcon className="w-4 h-4 text-red-400" />
                        )}
                      </TableCell>
                      <TableCell className="text-white">{booking.guest_name}</TableCell>
                      <TableCell className="text-slate-300">{booking.check_in_date}</TableCell>
                      <TableCell className="text-slate-300">{booking.check_out_date}</TableCell>
                      <TableCell className="text-slate-300">{booking.nights}</TableCell>
                      <TableCell className="text-white">${booking.total_price.toFixed(0)}</TableCell>
                      <TableCell className="text-slate-300">{booking.booking_source}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedBookings.length > 20 && (
                <p className="text-slate-400 text-sm text-center py-2">
                  מציג 20 מתוך {parsedBookings.length} הזמנות...
                </p>
              )}
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between bg-slate-800 rounded-lg p-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">{validCount} הזמנות חדשות תקינות</span>
                </div>
                {duplicateCount > 0 && (
                  <div className="flex items-center gap-2">
                    <RefreshCwIcon className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400">{duplicateCount} כפילויות (לא ייובאו)</span>
                  </div>
                )}
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircleIcon className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">{invalidCount} שגיאות</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setStep(autoMappingSuccess ? "upload" : "mapping")}
                className="border-slate-600"
              >
                חזרה
              </Button>
              <Button
                onClick={handleImport}
                className="bg-cyan-600 hover:bg-cyan-700"
                disabled={validCount === 0 || importing}
              >
                {importing ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    מייבא...
                  </>
                ) : (
                  `ייבוא ${validCount} הזמנות`
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="text-center py-12">
            <Loader2Icon className="w-16 h-16 mx-auto text-cyan-400 animate-spin mb-4" />
            <p className="text-white text-lg">מייבא הזמנות...</p>
            <p className="text-slate-400">אנא המתן</p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === "done" && importResult && (
          <div className="text-center py-8">
            <CheckCircleIcon className="w-16 h-16 mx-auto text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">הייבוא הושלם בהצלחה!</h3>
            <div className="flex justify-center gap-6 mb-6">
              <div>
                <p className="text-3xl font-bold text-green-400">{importResult.success}</p>
                <p className="text-slate-400 text-sm">הזמנות חדשות יובאו</p>
              </div>
              {importResult.skipped > 0 && (
                <div>
                  <p className="text-3xl font-bold text-yellow-400">{importResult.skipped}</p>
                  <p className="text-slate-400 text-sm">כפילויות דולגו</p>
                </div>
              )}
              {importResult.failed > 0 && (
                <div>
                  <p className="text-3xl font-bold text-red-400">{importResult.failed}</p>
                  <p className="text-slate-400 text-sm">נכשלו</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                setOpen(false)
                resetDialog()
                window.location.reload()
              }}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
