"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Hotel } from "@/lib/types"

export default function NewScanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedHotel = searchParams.get("hotel")

  const [hotels, setHotels] = useState<Hotel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedHotel, setSelectedHotel] = useState(preselectedHotel || "")
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetch("/api/hotels")
      .then((res) => res.json())
      .then(setHotels)
      .catch(console.error)
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch("/api/scan-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_id: selectedHotel,
          check_in_date: formData.get("check_in_date"),
          check_out_date: formData.get("check_out_date"),
          room_type: formData.get("room_type"),
          guests: Number.parseInt(formData.get("guests") as string) || 2,
          frequency: formData.get("frequency"),
          is_active: isActive,
        }),
      })

      if (!response.ok) throw new Error("Failed to create scan configuration")

      router.push("/scans")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/scans">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Scans
        </Button>
      </Link>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Scan Configuration</CardTitle>
          <CardDescription>Set up automated price monitoring for a hotel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hotel">Hotel *</Label>
              <Select value={selectedHotel} onValueChange={setSelectedHotel} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a hotel" />
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

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in_date">Check-in Date *</Label>
                <Input id="check_in_date" name="check_in_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out_date">Check-out Date *</Label>
                <Input id="check_out_date" name="check_out_date" type="date" required />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_type">Room Type</Label>
                <Input id="room_type" name="room_type" placeholder="Standard, Deluxe, Suite..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guests">Number of Guests</Label>
                <Input id="guests" name="guests" type="number" min="1" max="10" defaultValue="2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Scan Frequency</Label>
              <Select name="frequency" defaultValue="daily">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is_active">Activate immediately</Label>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-md">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Configuration"}
              </Button>
              <Link href="/scans">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
