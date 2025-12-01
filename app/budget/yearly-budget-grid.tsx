"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TargetIcon,
  PencilIcon,
  SaveIcon,
  Loader2Icon,
} from "@/components/icons"
import { useRouter } from "next/navigation"

interface YearlyBudgetGridProps {
  hotels: any[]
  budgets: any[]
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export function YearlyBudgetGrid({ hotels, budgets }: YearlyBudgetGridProps) {
  const router = useRouter()
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedHotelId, setSelectedHotelId] = useState(hotels[0]?.id || "")

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingMonth, setEditingMonth] = useState<number | null>(null)
  const [editingBudget, setEditingBudget] = useState<any>(null)
  const [editValues, setEditValues] = useState({
    targetRevenue: "",
    targetOccupancy: "",
    targetAdr: "",
  })
  const [saving, setSaving] = useState(false)

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // Filter budgets for selected hotel and year
  const hotelBudgets = budgets.filter((b) => b.hotel_id === selectedHotelId && b.year === selectedYear)

  // Calculate yearly total
  const yearlyTotal = hotelBudgets.reduce((sum, b) => sum + Number(b.target_revenue || 0), 0)
  const monthsWithBudget = hotelBudgets.length

  const handleMonthClick = (monthNum: number) => {
    const budget = hotelBudgets.find((b) => b.month === monthNum)
    setEditingMonth(monthNum)
    setEditingBudget(budget || null)
    setEditValues({
      targetRevenue: budget?.target_revenue?.toString() || "",
      targetOccupancy: budget?.target_occupancy?.toString() || "",
      targetAdr: budget?.target_adr?.toString() || "",
    })
    setEditModalOpen(true)
  }

  const handleSave = async () => {
    if (!editingMonth || !selectedHotelId) return

    setSaving(true)
    try {
      const response = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId: selectedHotelId,
          year: selectedYear,
          month: editingMonth,
          targetRevenue: Number(editValues.targetRevenue) || 0,
          targetOccupancy: editValues.targetOccupancy ? Number(editValues.targetOccupancy) : null,
          targetAdr: editValues.targetAdr ? Number(editValues.targetAdr) : null,
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      setEditModalOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Error saving budget:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-cyan-400" />
                Yearly Budget Overview
              </CardTitle>
              <CardDescription>Click on a month to edit its budget</CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Select value={selectedHotelId} onValueChange={setSelectedHotelId}>
                <SelectTrigger className="w-[150px] bg-background/50">
                  <SelectValue placeholder="Select hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setSelectedYear(selectedYear - 1)}>
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center font-medium">{selectedYear}</span>
                <Button variant="outline" size="icon" onClick={() => setSelectedYear(selectedYear + 1)}>
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-background/30 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Yearly Target</p>
              <p className="text-2xl font-bold text-cyan-400">₪{yearlyTotal.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Months Set</p>
              <p className="text-2xl font-bold">{monthsWithBudget}/12</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Avg Monthly</p>
              <p className="text-2xl font-bold">
                ₪{monthsWithBudget > 0 ? Math.round(yearlyTotal / monthsWithBudget).toLocaleString() : 0}
              </p>
            </div>
          </div>

          {/* Monthly Grid - Added onClick and cursor pointer */}
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {MONTHS.map((month, index) => {
              const monthNum = index + 1
              const budget = hotelBudgets.find((b) => b.month === monthNum)
              const isPast = selectedYear < currentYear || (selectedYear === currentYear && monthNum < currentMonth)
              const isCurrent = selectedYear === currentYear && monthNum === currentMonth
              const hasBudget = !!budget

              return (
                <div
                  key={month}
                  onClick={() => handleMonthClick(monthNum)}
                  className={`
                    relative p-4 rounded-lg border transition-all cursor-pointer group
                    ${isCurrent ? "border-cyan-500 bg-cyan-500/10" : "border-border/50 bg-background/30"}
                    ${isPast && !hasBudget ? "opacity-50" : ""}
                    hover:border-cyan-500/50 hover:bg-background/50
                  `}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <PencilIcon className="h-3 w-3 text-cyan-400" />
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${isCurrent ? "text-cyan-400" : "text-muted-foreground"}`}>
                      {month}
                    </span>
                    {hasBudget && <TargetIcon className="h-3 w-3 text-cyan-400" />}
                  </div>

                  {hasBudget ? (
                    <div className="space-y-1">
                      <p className="text-lg font-bold">₪{Number(budget.target_revenue).toLocaleString()}</p>
                      <div className="flex flex-col text-xs text-muted-foreground">
                        {budget.target_occupancy && <span>{budget.target_occupancy}% occ</span>}
                        {budget.target_adr && <span>₪{budget.target_adr} ADR</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-lg font-medium text-muted-foreground">—</p>
                      <p className="text-xs text-muted-foreground">Click to set</p>
                    </div>
                  )}

                  {/* Current month indicator */}
                  {isCurrent && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full animate-pulse" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Quick fill option */}
          {monthsWithBudget < 12 && (
            <div className="mt-6 p-4 border border-dashed border-border/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {12 - monthsWithBudget} months without budget. Click on any month to set or edit its budget.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TargetIcon className="h-5 w-5 text-cyan-400" />
              {editingBudget ? "Edit" : "Set"} Budget - {editingMonth ? FULL_MONTHS[editingMonth - 1] : ""}{" "}
              {selectedYear}
            </DialogTitle>
            <DialogDescription>
              {editingBudget ? "Update the budget targets for this month" : "Set the budget targets for this month"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="targetRevenue">Target Revenue (₪)</Label>
              <Input
                id="targetRevenue"
                type="number"
                placeholder="e.g. 100000"
                value={editValues.targetRevenue}
                onChange={(e) => setEditValues({ ...editValues, targetRevenue: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetOccupancy">Target Occupancy (%)</Label>
              <Input
                id="targetOccupancy"
                type="number"
                placeholder="e.g. 75"
                min="0"
                max="100"
                value={editValues.targetOccupancy}
                onChange={(e) => setEditValues({ ...editValues, targetOccupancy: e.target.value })}
                className="bg-background/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targetAdr">Target ADR (₪)</Label>
              <Input
                id="targetAdr"
                type="number"
                placeholder="e.g. 450"
                value={editValues.targetAdr}
                onChange={(e) => setEditValues({ ...editValues, targetAdr: e.target.value })}
                className="bg-background/50"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !editValues.targetRevenue}>
              {saving ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="mr-2 h-4 w-4" />
                  Save Budget
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
