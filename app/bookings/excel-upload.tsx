"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { UploadIcon, FileSpreadsheetIcon, CheckCircleIcon, AlertCircleIcon, Loader2Icon } from "@/components/icons"

interface Hotel {
  id: string
  name: string
  total_rooms?: number
}

export function ExcelUpload({ hotels, onImportComplete }: { hotels: Hotel[]; onImportComplete?: () => void }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"upload" | "importing" | "done">("upload")
  const [selectedHotel, setSelectedHotel] = useState<string>("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedHotel) {
      alert("אנא בחר מלון קודם")
      return
    }

    setImporting(true)
    setStep("importing")
    setError(null)

    const formData = new FormData()
    formData.append("file", selectedFile)
    formData.append("hotelId", selectedHotel)

    try {
      const response = await fetch("/api/bookings/import-pms", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to import")
      }

      setImportResult({
        success: result.imported || 0,
        failed: result.failed || 0,
        total: result.total || 0,
      })
      setStep("done")

      if (onImportComplete) {
        onImportComplete()
      }
    } catch (error) {
      console.error("[v0] Import error:", error)
      setError(error instanceof Error ? error.message : "שגיאה בייבוא הקובץ")
      setStep("upload")
    } finally {
      setImporting(false)
    }
  }

  const resetDialog = () => {
    setStep("upload")
    setImportResult(null)
    setError(null)
    setSelectedHotel("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

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
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileSpreadsheetIcon className="h-5 w-5 text-emerald-400" />
            ייבוא הזמנות ממערכת PMS
          </DialogTitle>
          <DialogDescription className="text-slate-400">העלה קובץ אקסל - המערכת תזהה ותייבא אוטומטית</DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload - Select hotel and file */}
        {step === "upload" && (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center gap-2">
                <AlertCircleIcon className="h-5 w-5 text-red-400" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-2">בחר מלון</label>
              <Select value={selectedHotel} onValueChange={setSelectedHotel}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="בחר מלון..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id} className="text-white">
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                selectedHotel
                  ? "border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500/5"
                  : "border-slate-600 opacity-50 cursor-not-allowed"
              }`}
              onClick={() => selectedHotel && fileInputRef.current?.click()}
            >
              <UploadIcon className="h-12 w-12 mx-auto text-slate-500 mb-4" />
              <p className="text-lg font-medium text-slate-300 mb-2">
                {selectedHotel ? "לחץ לבחירת קובץ או גרור לכאן" : "בחר מלון קודם"}
              </p>
              <p className="text-sm text-slate-500">תומך בקבצי .xlsx, .xls, .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                disabled={!selectedHotel}
              />
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-400">זיהוי אוטומטי של עמודות</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400">
                <p>המערכת מזהה אוטומטית עמודות בעברית ובאנגלית:</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["שם אורח", "תאריך כניסה", "תאריך יציאה", "סה״כ", "מקור", "סוג חדר", "סטטוס"].map((col) => (
                    <Badge key={col} variant="outline" className="text-xs border-slate-600 text-slate-300">
                      {col}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Importing */}
        {step === "importing" && (
          <div className="py-12 text-center">
            <Loader2Icon className="h-12 w-12 mx-auto text-cyan-400 animate-spin mb-4" />
            <p className="text-lg font-medium text-white mb-2">מייבא הזמנות...</p>
            <p className="text-sm text-slate-400">אנא המתן, מזהה ומעבד את הנתונים</p>
          </div>
        )}

        {/* Step 3: Done */}
        {step === "done" && importResult && (
          <div className="py-8 text-center space-y-6">
            <CheckCircleIcon className="h-16 w-16 mx-auto text-emerald-400" />
            <div>
              <p className="text-xl font-bold text-white mb-2">הייבוא הושלם!</p>
              <div className="flex justify-center gap-6 mt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400">{importResult.success}</div>
                  <div className="text-sm text-slate-400">יובאו בהצלחה</div>
                </div>
                {importResult.failed > 0 && (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-amber-400">{importResult.failed}</div>
                    <div className="text-sm text-slate-400">נדלגו (כפילויות)</div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-400">{importResult.total}</div>
                  <div className="text-sm text-slate-400">סה״כ בקובץ</div>
                </div>
              </div>
            </div>
            <Button onClick={() => setOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
