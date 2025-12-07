"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SparklesIcon, Loader2Icon, ClockIcon, CalendarIcon } from "@/components/icons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface Hotel {
  id: string
  name: string
  base_price: number | null
}

const MONTHS = [
  { value: 1, label: "ינואר", labelEn: "January" },
  { value: 2, label: "פברואר", labelEn: "February" },
  { value: 3, label: "מרץ", labelEn: "March" },
  { value: 4, label: "אפריל", labelEn: "April" },
  { value: 5, label: "מאי", labelEn: "May" },
  { value: 6, label: "יוני", labelEn: "June" },
  { value: 7, label: "יולי", labelEn: "July" },
  { value: 8, label: "אוגוסט", labelEn: "August" },
  { value: 9, label: "ספטמבר", labelEn: "September" },
  { value: 10, label: "אוקטובר", labelEn: "October" },
  { value: 11, label: "נובמבר", labelEn: "November" },
  { value: 12, label: "דצמבר", labelEn: "December" },
]

export function GeneratePredictionsButton({ hotels }: { hotels: Hotel[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [daysAhead, setDaysAhead] = useState("90")

  // Month selection
  const currentMonth = new Date().getMonth() + 1
  const [selectedMonths, setSelectedMonths] = useState<number[]>([currentMonth])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Analysis parameters
  const [analysisParams, setAnalysisParams] = useState({
    includeCompetitors: true,
    includeSeasonality: true,
    includeEvents: true,
    includeOccupancy: true,
    includeBudget: true,
    includeFutureBookings: true,
    includeMarketTrends: true,
    includeWeather: false,
  })

  useEffect(() => {
    if (!autoRefresh || hotels.length === 0) return

    const checkAndRefresh = () => {
      const lastGen = localStorage.getItem("predictions_last_generated")
      if (lastGen) {
        const lastDate = new Date(lastGen)
        setLastGenerated(lastDate)
        const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60)

        // Auto-generate if more than 1 hour since last generation
        if (hoursSince >= 1) {
          handleGenerate()
        }
      } else {
        // First time - generate predictions
        handleGenerate()
      }
    }

    // Check on mount
    checkAndRefresh()

    // Check every 5 minutes
    const interval = setInterval(checkAndRefresh, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, hotels.length])

  const handleGenerate = async () => {
    if (loading || hotels.length === 0 || selectedMonths.length === 0) return

    setLoading(true)
    try {
      const res = await fetch("/api/predictions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotels,
          daysAhead: Number.parseInt(daysAhead),
          selectedMonths,
          selectedYear,
          analysisParams,
        }),
      })

      if (res.ok) {
        const now = new Date()
        setLastGenerated(now)
        localStorage.setItem("predictions_last_generated", now.toISOString())
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60))
    if (minutes < 1) return "עכשיו"
    if (minutes < 60) return `לפני ${minutes} דקות`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `לפני ${hours} שעות`
    return `לפני ${Math.floor(hours / 24)} ימים`
  }

  const toggleMonth = (month: number) => {
    setSelectedMonths((prev) =>
      prev.includes(month) ? prev.filter((m) => m !== month) : [...prev, month].sort((a, b) => a - b),
    )
  }

  const selectAllMonths = () => setSelectedMonths(MONTHS.map((m) => m.value))
  const selectQuarter = (q: number) => {
    const quarters = {
      1: [1, 2, 3],
      2: [4, 5, 6],
      3: [7, 8, 9],
      4: [10, 11, 12],
    }
    setSelectedMonths(quarters[q as keyof typeof quarters])
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
        <SelectTrigger className="w-[100px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
          <SelectItem value={(new Date().getFullYear() + 1).toString()}>{new Date().getFullYear() + 1}</SelectItem>
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 bg-transparent">
            <CalendarIcon className="h-4 w-4" />
            {selectedMonths.length === 12
              ? "כל השנה"
              : selectedMonths.length === 1
                ? MONTHS[selectedMonths[0] - 1].label
                : `${selectedMonths.length} חודשים`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="font-medium">בחר חודשים לניתוח</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectAllMonths}>
                כל השנה
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectQuarter(1)}>
                Q1
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectQuarter(2)}>
                Q2
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectQuarter(3)}>
                Q3
              </Button>
              <Button size="sm" variant="outline" onClick={() => selectQuarter(4)}>
                Q4
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {MONTHS.map((month) => (
                <div
                  key={month.value}
                  className={`p-2 text-center rounded cursor-pointer border transition-colors ${
                    selectedMonths.includes(month.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted border-border"
                  }`}
                  onClick={() => toggleMonth(month.value)}
                >
                  <div className="text-sm font-medium">{month.label}</div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 bg-transparent">
            <SparklesIcon className="h-4 w-4" />
            פרמטרים
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="font-medium">פרמטרים לניתוח</div>
            <div className="space-y-3">
              {[
                { key: "includeCompetitors", label: "נתוני מתחרים", desc: "מחירי מתחרים מהסריקות" },
                { key: "includeSeasonality", label: "עונתיות", desc: "גורמי עונה וחגים" },
                { key: "includeEvents", label: "אירועים", desc: "אירועים מיוחדים וכנסים" },
                { key: "includeOccupancy", label: "תפוסה", desc: "נתוני תפוסה היסטוריים" },
                { key: "includeBudget", label: "תקציב", desc: "יעדי תקציב והכנסות" },
                { key: "includeFutureBookings", label: "הזמנות עתידיות", desc: "הזמנות קיימות" },
                { key: "includeMarketTrends", label: "מגמות שוק", desc: "מגמות כלליות בשוק" },
              ].map((param) => (
                <div key={param.key} className="flex items-start space-x-3 space-x-reverse">
                  <Checkbox
                    id={param.key}
                    checked={analysisParams[param.key as keyof typeof analysisParams]}
                    onCheckedChange={(checked) => setAnalysisParams((prev) => ({ ...prev, [param.key]: checked }))}
                  />
                  <div className="grid gap-1 leading-none">
                    <Label htmlFor={param.key} className="cursor-pointer">
                      {param.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{param.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Days ahead selector */}
      <Select value={daysAhead} onValueChange={setDaysAhead}>
        <SelectTrigger className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30">30 יום</SelectItem>
          <SelectItem value="60">60 יום</SelectItem>
          <SelectItem value="90">90 יום</SelectItem>
          <SelectItem value="180">180 יום</SelectItem>
          <SelectItem value="365">שנה</SelectItem>
        </SelectContent>
      </Select>

      {/* Auto-refresh indicator */}
      <Badge
        variant={autoRefresh ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => setAutoRefresh(!autoRefresh)}
      >
        <ClockIcon className="h-3 w-3 mr-1" />
        {autoRefresh ? "Auto 1h" : "Manual"}
      </Badge>

      {/* Last generated time */}
      {lastGenerated && <span className="text-xs text-muted-foreground">עדכון: {formatTimeAgo(lastGenerated)}</span>}

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={loading || hotels.length === 0 || selectedMonths.length === 0}
        className="gap-2"
      >
        {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SparklesIcon className="h-4 w-4" />}
        צור חיזויים
      </Button>
    </div>
  )
}
