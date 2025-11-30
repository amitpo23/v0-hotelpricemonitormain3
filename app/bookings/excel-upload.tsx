"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
  isValid: boolean
  errors: string[]
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
}

interface ImportAnalytics {
  totalBookings: number
  totalRevenue: number
  totalRoomNights: number
  avgNightlyRate: number
  avgStayLength: number
  occupancyByMonth: Record<string, { roomNights: number; revenue: number; bookings: number }>
  bookingPace: Record<string, number> // bookings per day
  sourceBreakdown: Record<string, { count: number; revenue: number }>
  roomTypeBreakdown: Record<string, { count: number; revenue: number; avgRate: number }>
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
  })
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

        setStep("mapping")
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
    }

    // Extended patterns for Hebrew PMS systems
    const patterns: Record<keyof ColumnMapping, RegExp[]> = {
      guest_name: [/guest/i, /name/i, /שם/i, /אורח/i, /לקוח/i, /שם אורח/i, /שם הלקוח/i, /customer/i],
      check_in_date: [/check.?in/i, /arrival/i, /כניסה/i, /הגעה/i, /from/i, /תאריך כניסה/i, /מתאריך/i, /תחילה/i],
      check_out_date: [/check.?out/i, /departure/i, /יציאה/i, /עזיבה/i, /to/i, /תאריך יציאה/i, /עד תאריך/i, /סיום/i],
      room_type: [/room.?type/i, /category/i, /סוג.?חדר/i, /קטגוריה/i, /type/i, /חדר סוג/i],
      room_number: [/room.?no/i, /room.?num/i, /חדר/i, /מספר חדר/i, /room$/i, /חדר מספר/i],
      room_count: [/room.?count/i, /rooms/i, /qty/i, /כמות/i, /חדרים/i, /מספר חדרים/i],
      nights: [/nights/i, /לילות/i, /מספר לילות/i, /duration/i, /ימים/i],
      nightly_rate: [/rate/i, /night/i, /מחיר.?לילה/i, /תעריף/i, /ללילה/i, /מחיר ללילה/i, /adr/i],
      total_price: [/total/i, /price/i, /amount/i, /סה"כ/i, /סכום/i, /מחיר/i, /תשלום/i, /סה״כ/i, /סהכ/i, /revenue/i],
      booking_source: [/source/i, /channel/i, /ota/i, /מקור/i, /ערוץ/i, /אתר/i, /booking.?source/i, /מקור הזמנה/i],
      booking_date: [/booking.?date/i, /created/i, /תאריך הזמנה/i, /נוצר/i, /הוזמן/i, /reservation.?date/i],
      status: [/status/i, /סטטוס/i, /מצב/i, /state/i, /confirmed/i, /cancelled/i],
    }

    headers.forEach((header) => {
      const normalizedHeader = header.trim()
      for (const [field, regexList] of Object.entries(patterns)) {
        if (regexList.some((regex) => regex.test(normalizedHeader))) {
          if (!mapping[field as keyof ColumnMapping]) {
            mapping[field as keyof ColumnMapping] = header
          }
        }
      }
    })

    return mapping
  }

  const applyMapping = () => {
    const bookings: ParsedBooking[] = rawData.map((row) => {
      const errors: string[] = []

      const checkIn = parseDate(row[columnMapping.check_in_date])
      const checkOut = parseDate(row[columnMapping.check_out_date])
      const bookingDate = parseDate(row[columnMapping.booking_date]) || new Date().toISOString().split("T")[0]
      const roomCount = Number.parseInt(row[columnMapping.room_count]) || 1
      const nightsFromColumn = Number.parseInt(row[columnMapping.nights]) || 0
      const nightlyRate = parseNumber(row[columnMapping.nightly_rate])
      const totalPrice = parseNumber(row[columnMapping.total_price])

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

      return {
        guest_name: row[columnMapping.guest_name] || "אורח",
        check_in_date: checkIn || "",
        check_out_date: checkOut || "",
        room_type: row[columnMapping.room_type] || "Standard",
        room_number: row[columnMapping.room_number] || "",
        room_count: roomCount,
        nights: calculatedNights,
        nightly_rate: calculatedRate,
        total_price: calculatedTotal,
        booking_source: row[columnMapping.booking_source] || "PMS Import",
        booking_date: bookingDate,
        status: parseStatus(row[columnMapping.status]),
        isValid: errors.length === 0,
        errors,
      }
    })

    setParsedBookings(bookings)

    const validBookings = bookings.filter((b) => b.isValid)
    const analyticsData = calculateAnalytics(validBookings)
    setAnalytics(analyticsData)

    setStep("preview")
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

  const calculateAnalytics = (bookings: ParsedBooking[]): ImportAnalytics => {
    const analytics: ImportAnalytics = {
      totalBookings: bookings.length,
      totalRevenue: 0,
      totalRoomNights: 0,
      avgNightlyRate: 0,
      avgStayLength: 0,
      occupancyByMonth: {},
      bookingPace: {},
      sourceBreakdown: {},
      roomTypeBreakdown: {},
    }

    let totalNights = 0
    let totalRateSum = 0

    bookings.forEach((booking) => {
      if (booking.status === "cancelled") return

      analytics.totalRevenue += booking.total_price
      const roomNights = booking.nights * booking.room_count
      analytics.totalRoomNights += roomNights
      totalNights += booking.nights
      totalRateSum += booking.nightly_rate

      // Occupancy by month
      if (booking.check_in_date) {
        const month = booking.check_in_date.substring(0, 7) // YYYY-MM
        if (!analytics.occupancyByMonth[month]) {
          analytics.occupancyByMonth[month] = { roomNights: 0, revenue: 0, bookings: 0 }
        }
        analytics.occupancyByMonth[month].roomNights += roomNights
        analytics.occupancyByMonth[month].revenue += booking.total_price
        analytics.occupancyByMonth[month].bookings += 1
      }

      // Booking pace (by booking date)
      if (booking.booking_date) {
        const date = booking.booking_date
        analytics.bookingPace[date] = (analytics.bookingPace[date] || 0) + 1
      }

      // Source breakdown
      const source = booking.booking_source || "Direct"
      if (!analytics.sourceBreakdown[source]) {
        analytics.sourceBreakdown[source] = { count: 0, revenue: 0 }
      }
      analytics.sourceBreakdown[source].count += 1
      analytics.sourceBreakdown[source].revenue += booking.total_price

      // Room type breakdown
      const roomType = booking.room_type || "Standard"
      if (!analytics.roomTypeBreakdown[roomType]) {
        analytics.roomTypeBreakdown[roomType] = { count: 0, revenue: 0, avgRate: 0 }
      }
      analytics.roomTypeBreakdown[roomType].count += 1
      analytics.roomTypeBreakdown[roomType].revenue += booking.total_price
    })

    const confirmedBookings = bookings.filter((b) => b.status !== "cancelled")
    analytics.avgNightlyRate = confirmedBookings.length > 0 ? totalRateSum / confirmedBookings.length : 0
    analytics.avgStayLength = confirmedBookings.length > 0 ? totalNights / confirmedBookings.length : 0

    // Calculate average rate per room type
    Object.keys(analytics.roomTypeBreakdown).forEach((type) => {
      const data = analytics.roomTypeBreakdown[type]
      data.avgRate = data.count > 0 ? data.revenue / data.count : 0
    })

    return analytics
  }

  const importBookings = async () => {
    if (!selectedHotel) {
      alert("Please select a hotel")
      return
    }

    setImporting(true)
    setStep("importing")

    const validBookings = parsedBookings.filter((b) => b.isValid && b.status !== "cancelled")

    try {
      const response = await fetch("/api/bookings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: selectedHotel,
          bookings: validBookings.map((b) => ({
            guest_name: b.guest_name,
            check_in_date: b.check_in_date,
            check_out_date: b.check_out_date,
            room_type: b.room_type,
            room_number: b.room_number,
            room_count: b.room_count,
            nights: b.nights,
            nightly_rate: b.nightly_rate,
            total_price: b.total_price,
            booking_source: b.booking_source,
            booking_date: b.booking_date,
            status: b.status,
          })),
          analytics: analytics,
        }),
      })

      const result = await response.json()
      setImportResult({
        success: result.imported || 0,
        failed: validBookings.length - (result.imported || 0),
      })
      setStep("done")
    } catch (error) {
      console.error("Import error:", error)
      setImportResult({ success: 0, failed: validBookings.length })
      setStep("done")
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
    setSelectedHotel("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const validCount = parsedBookings.filter((b) => b.isValid).length
  const invalidCount = parsedBookings.filter((b) => !b.isValid).length
  const cancelledCount = parsedBookings.filter((b) => b.status === "cancelled").length

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 bg-transparent"
        >
          <FileSpreadsheetIcon className="h-4 w-4 mr-2" />
          Import from PMS
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileSpreadsheetIcon className="h-5 w-5 text-emerald-400" />
            ייבוא הזמנות ממערכת PMS
          </DialogTitle>
          <DialogDescription>העלה קובץ אקסל עם נתוני הזמנות ממערכת ה-PMS שלך</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
          {["upload", "mapping", "preview", "done"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? "bg-cyan-500 text-white"
                    : ["upload", "mapping", "preview", "importing", "done"].indexOf(step) > i
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-700 text-slate-400"
                }`}
              >
                {["upload", "mapping", "preview", "importing", "done"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    ["upload", "mapping", "preview", "importing", "done"].indexOf(step) > i
                      ? "bg-emerald-500"
                      : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">בחר מלון</label>
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue placeholder="בחר מלון..." />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon className="h-12 w-12 mx-auto text-slate-500 mb-4" />
              <p className="text-lg font-medium text-slate-300 mb-2">גרור קובץ אקסל לכאן או לחץ לבחירה</p>
              <p className="text-sm text-slate-500">תומך בקבצי .xlsx, .xls, .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">עמודות נתמכות (עברית/אנגלית)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                  <div>• שם אורח / Guest Name</div>
                  <div>• תאריך כניסה / Check-in</div>
                  <div>• תאריך יציאה / Check-out</div>
                  <div>• סוג חדר / Room Type</div>
                  <div>• מספר חדר / Room Number</div>
                  <div>• מספר לילות / Nights</div>
                  <div>• מחיר ללילה / Nightly Rate</div>
                  <div>• סה"כ / Total Price</div>
                  <div>• מקור הזמנה / Booking Source</div>
                  <div>• תאריך הזמנה / Booking Date</div>
                  <div>• סטטוס / Status</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-sm text-slate-300">מיפוי עמודות</CardTitle>
                <CardDescription>בחר איזה עמודה מתאימה לכל שדה. המערכת ניסתה לזהות אוטומטית.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries({
                    guest_name: "שם אורח",
                    check_in_date: "תאריך כניסה *",
                    check_out_date: "תאריך יציאה *",
                    room_type: "סוג חדר",
                    room_number: "מספר חדר",
                    room_count: "כמות חדרים",
                    nights: "מספר לילות",
                    nightly_rate: "מחיר ללילה",
                    total_price: 'סה"כ *',
                    booking_source: "מקור הזמנה",
                    booking_date: "תאריך הזמנה",
                    status: "סטטוס",
                  }).map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-400 mb-1">{label}</label>
                      <Select
                        value={columnMapping[key as keyof ColumnMapping] || "__none__"}
                        onValueChange={(value) =>
                          setColumnMapping((prev) => ({
                            ...prev,
                            [key]: value === "__none__" ? "" : value,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700">
                          <SelectValue placeholder="בחר עמודה..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- לא ממופה --</SelectItem>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                חזרה
              </Button>
              <Button
                onClick={applyMapping}
                disabled={!columnMapping.check_in_date || !columnMapping.check_out_date}
                className="bg-cyan-500 hover:bg-cyan-600"
              >
                תצוגה מקדימה
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview with Analytics */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* Status badges */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge className="bg-emerald-500/20 text-emerald-400">
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                {validCount} תקינות
              </Badge>
              {invalidCount > 0 && (
                <Badge className="bg-red-500/20 text-red-400">
                  <AlertCircleIcon className="h-3 w-3 mr-1" />
                  {invalidCount} שגיאות
                </Badge>
              )}
              {cancelledCount > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400">{cancelledCount} ביטולים</Badge>
              )}
            </div>

            {/* Analytics Cards */}
            {analytics && (
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <CalendarIcon className="h-4 w-4" />
                      סה"כ הזמנות
                    </div>
                    <p className="text-2xl font-bold text-white">{analytics.totalBookings}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <TrendingUpIcon className="h-4 w-4" />
                      סה"כ הכנסות
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">₪{analytics.totalRevenue.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <BedDoubleIcon className="h-4 w-4" />
                      לילות חדר
                    </div>
                    <p className="text-2xl font-bold text-cyan-400">{analytics.totalRoomNights}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <BarChart3Icon className="h-4 w-4" />
                      ADR ממוצע
                    </div>
                    <p className="text-2xl font-bold text-white">₪{analytics.avgNightlyRate.toFixed(0)}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Source breakdown */}
            {analytics && Object.keys(analytics.sourceBreakdown).length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">פילוח לפי מקור הזמנה</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(analytics.sourceBreakdown).map(([source, data]) => (
                      <div key={source} className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-white font-medium truncate">{source}</p>
                        <p className="text-sm text-slate-400">{data.count} הזמנות</p>
                        <p className="text-sm text-emerald-400">₪{data.revenue.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Room type breakdown */}
            {analytics && Object.keys(analytics.roomTypeBreakdown).length > 0 && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">פילוח לפי סוג חדר</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(analytics.roomTypeBreakdown).map(([type, data]) => (
                      <div key={type} className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-white font-medium truncate">{type}</p>
                        <p className="text-sm text-slate-400">{data.count} הזמנות</p>
                        <p className="text-sm text-cyan-400">ADR: ₪{data.avgRate.toFixed(0)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bookings table */}
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-700">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-800">
                    <TableHead className="text-slate-300">סטטוס</TableHead>
                    <TableHead className="text-slate-300">אורח</TableHead>
                    <TableHead className="text-slate-300">כניסה</TableHead>
                    <TableHead className="text-slate-300">יציאה</TableHead>
                    <TableHead className="text-slate-300">לילות</TableHead>
                    <TableHead className="text-slate-300">סוג חדר</TableHead>
                    <TableHead className="text-slate-300">מקור</TableHead>
                    <TableHead className="text-right text-slate-300">סה"כ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedBookings.slice(0, 30).map((booking, i) => (
                    <TableRow
                      key={i}
                      className={
                        !booking.isValid ? "bg-red-500/10" : booking.status === "cancelled" ? "bg-yellow-500/10" : ""
                      }
                    >
                      <TableCell>
                        {booking.isValid ? (
                          booking.status === "cancelled" ? (
                            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                              ביטול
                            </Badge>
                          ) : (
                            <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                          )
                        ) : (
                          <div className="flex items-center gap-1">
                            <AlertCircleIcon className="h-4 w-4 text-red-400" />
                            <span className="text-xs text-red-400">{booking.errors[0]}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">{booking.guest_name}</TableCell>
                      <TableCell className="text-slate-300">{booking.check_in_date}</TableCell>
                      <TableCell className="text-slate-300">{booking.check_out_date}</TableCell>
                      <TableCell className="text-slate-300">{booking.nights}</TableCell>
                      <TableCell className="text-slate-300">{booking.room_type}</TableCell>
                      <TableCell className="text-slate-300">{booking.booking_source}</TableCell>
                      <TableCell className="text-right text-slate-300">
                        ₪{booking.total_price.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {parsedBookings.length > 30 && (
              <p className="text-sm text-slate-500 text-center">מציג 30 מתוך {parsedBookings.length} הזמנות</p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                חזרה
              </Button>
              <Button
                onClick={importBookings}
                disabled={validCount === 0}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                ייבא {validCount - cancelledCount} הזמנות
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2Icon className="h-12 w-12 mx-auto text-cyan-400 animate-spin mb-4" />
            <p className="text-lg text-slate-300">מייבא הזמנות...</p>
            <p className="text-sm text-slate-500 mt-2">זה עשוי לקחת רגע</p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === "done" && importResult && (
          <div className="py-8 text-center">
            {importResult.success > 0 ? (
              <>
                <CheckCircleIcon className="h-16 w-16 mx-auto text-emerald-400 mb-4" />
                <p className="text-xl font-medium text-white mb-2">הייבוא הושלם בהצלחה!</p>
                <p className="text-slate-400">
                  יובאו {importResult.success} הזמנות
                  {importResult.failed > 0 && ` (${importResult.failed} נכשלו)`}
                </p>
                {analytics && (
                  <div className="mt-4 p-4 bg-slate-800 rounded-lg inline-block">
                    <p className="text-emerald-400 text-lg font-medium">₪{analytics.totalRevenue.toLocaleString()}</p>
                    <p className="text-slate-400 text-sm">סה"כ הכנסות מיובאות</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <AlertCircleIcon className="h-16 w-16 mx-auto text-red-400 mb-4" />
                <p className="text-xl font-medium text-white mb-2">הייבוא נכשל</p>
                <p className="text-slate-400">לא ניתן היה לייבא את ההזמנות. נסה שוב.</p>
              </>
            )}
            <Button
              className="mt-6"
              onClick={() => {
                resetDialog()
                setOpen(false)
                window.location.reload()
              }}
            >
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
