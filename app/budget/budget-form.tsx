"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"

interface BudgetFormProps {
  hotels: any[]
  existingBudgets: any[]
}

export function BudgetForm({ hotels, existingBudgets }: BudgetFormProps) {
  const [loading, setLoading] = useState(false)
  const [hotelId, setHotelId] = useState("")
  const [targetRevenue, setTargetRevenue] = useState("")
  const [targetOccupancy, setTargetOccupancy] = useState("")
  const [targetAdr, setTargetAdr] = useState("")
  const router = useRouter()

  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1

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
          year: currentYear,
          month: currentMonth,
          targetRevenue: Number.parseFloat(targetRevenue),
          targetOccupancy: targetOccupancy ? Number.parseFloat(targetOccupancy) : null,
          targetAdr: targetAdr ? Number.parseFloat(targetAdr) : null,
        }),
      })

      if (response.ok) {
        setHotelId("")
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

  const hotelsWithoutBudget = hotels.filter((h) => !existingBudgets.find((b) => b.hotel_id === h.id))

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="text-lg">Set Monthly Budget</CardTitle>
        <CardDescription>
          Define revenue targets for{" "}
          {new Date(currentYear, currentMonth - 1).toLocaleString("default", { month: "long" })} {currentYear}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Hotel</Label>
            <Select value={hotelId} onValueChange={setHotelId}>
              <SelectTrigger className="bg-background/50">
                <SelectValue placeholder="Select hotel" />
              </SelectTrigger>
              <SelectContent>
                {hotelsWithoutBudget.map((hotel) => (
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
              placeholder="50000"
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
              placeholder="75"
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
              placeholder="150"
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Set Budget
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
