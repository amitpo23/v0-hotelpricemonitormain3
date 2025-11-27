"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusIcon, Loader2Icon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons"

interface BudgetFormProps {
  hotels: any[]
  existingBudgets: any[]
}

const MONTHS = [
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

export function BudgetForm({ hotels, existingBudgets }: BudgetFormProps) {
  const [loading, setLoading] = useState(false)
  const [hotelId, setHotelId] = useState(hotels[0]?.id || "")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [targetRevenue, setTargetRevenue] = useState("")
  const [targetOccupancy, setTargetOccupancy] = useState("")
  const [targetAdr, setTargetAdr] = useState("")
  const router = useRouter()

  // Check if budget exists for selected month
  const existingBudget = existingBudgets.find(
    (b) => b.hotel_id === hotelId && b.year === selectedYear && b.month === selectedMonth,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hotelId || !targetRevenue) return

    setLoading(true)

    try {
      const response = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelId,
          year: selectedYear,
          month: selectedMonth,
          targetRevenue: Number.parseFloat(targetRevenue),
          targetOccupancy: targetOccupancy ? Number.parseFloat(targetOccupancy) : null,
          targetAdr: targetAdr ? Number.parseFloat(targetAdr) : null,
        }),
      })

      if (response.ok) {
        setTargetRevenue("")
        setTargetOccupancy("")
        setTargetAdr("")
        router.refresh()
      }
    } catch (error) {
      console.error("Failed to save budget:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg">Set Monthly Budget</CardTitle>
        <CardDescription>Define revenue targets for each month individually</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-center gap-4 p-4 bg-background/30 rounded-lg">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              if (selectedMonth === 1) {
                setSelectedMonth(12)
                setSelectedYear(selectedYear - 1)
              } else {
                setSelectedMonth(selectedMonth - 1)
              }
            }}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number.parseInt(v))}>
              <SelectTrigger className="w-[140px] bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number.parseInt(v))}>
              <SelectTrigger className="w-[100px] bg-background/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026, 2027].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              if (selectedMonth === 12) {
                setSelectedMonth(1)
                setSelectedYear(selectedYear + 1)
              } else {
                setSelectedMonth(selectedMonth + 1)
              }
            }}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Show existing budget if exists */}
        {existingBudget && (
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <p className="text-sm text-cyan-400 font-medium">
              Budget already set for {MONTHS[selectedMonth - 1]} {selectedYear}:
            </p>
            <p className="text-lg font-bold mt-1">
              ${Number(existingBudget.target_revenue).toLocaleString()} target revenue
              {existingBudget.target_occupancy && ` • ${existingBudget.target_occupancy}% occupancy`}
              {existingBudget.target_adr && ` • $${existingBudget.target_adr} ADR`}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Hotel</Label>
            <Select value={hotelId} onValueChange={setHotelId}>
              <SelectTrigger className="bg-background/50">
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
          </div>
          <div className="space-y-2">
            <Label>Target Revenue ($)</Label>
            <Input
              type="number"
              placeholder={existingBudget ? existingBudget.target_revenue.toString() : "50000"}
              value={targetRevenue}
              onChange={(e) => setTargetRevenue(e.target.value)}
              className="bg-background/50"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Target Occupancy (%)</Label>
            <Input
              type="number"
              placeholder={existingBudget?.target_occupancy?.toString() || "75"}
              value={targetOccupancy}
              onChange={(e) => setTargetOccupancy(e.target.value)}
              className="bg-background/50"
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Target ADR ($)</Label>
            <Input
              type="number"
              placeholder={existingBudget?.target_adr?.toString() || "150"}
              value={targetAdr}
              onChange={(e) => setTargetAdr(e.target.value)}
              className="bg-background/50"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={loading || !hotelId || !targetRevenue}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {loading ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {existingBudget ? "Update Budget" : "Set Budget"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
