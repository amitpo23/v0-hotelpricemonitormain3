"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, CalendarDays } from "lucide-react"
import Link from "next/link"

export default function AddBookingPage() {
  const router = useRouter()
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    hotel_id: "",
    check_in_date: "",
    check_out_date: "",
    room_type: "Standard",
    room_count: 1,
    nightly_rate: 150,
    guest_name: "",
    booking_source: "direct",
  })

  useEffect(() => {
    fetch("/api/hotels")
      .then((res) => res.json())
      .then((data) => setHotels(data.hotels || []))
  }, [])

  const nights =
    formData.check_in_date && formData.check_out_date
      ? Math.ceil(
          (new Date(formData.check_out_date).getTime() - new Date(formData.check_in_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0

  const totalPrice = nights * formData.nightly_rate * formData.room_count

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          total_price: totalPrice,
        }),
      })

      if (res.ok) {
        router.push("/bookings")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Link href="/bookings" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </Link>

      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-cyan-400" />
            Add New Booking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Hotel</Label>
              <Select
                value={formData.hotel_id}
                onValueChange={(value) => setFormData({ ...formData, hotel_id: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Check-in Date</Label>
                <Input
                  type="date"
                  value={formData.check_in_date}
                  onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  required
                />
              </div>
              <div>
                <Label>Check-out Date</Label>
                <Input
                  type="date"
                  value={formData.check_out_date}
                  onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                  className="bg-slate-800 border-slate-700"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Room Type</Label>
                <Select
                  value={formData.room_type}
                  onValueChange={(value) => setFormData({ ...formData, room_type: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Deluxe">Deluxe</SelectItem>
                    <SelectItem value="Suite">Suite</SelectItem>
                    <SelectItem value="Family">Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Number of Rooms</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.room_count}
                  onChange={(e) => setFormData({ ...formData, room_count: Number.parseInt(e.target.value) || 1 })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nightly Rate ($)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.nightly_rate}
                  onChange={(e) => setFormData({ ...formData, nightly_rate: Number.parseFloat(e.target.value) || 0 })}
                  className="bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <Label>Booking Source</Label>
                <Select
                  value={formData.booking_source}
                  onValueChange={(value) => setFormData({ ...formData, booking_source: value })}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="booking.com">Booking.com</SelectItem>
                    <SelectItem value="expedia">Expedia</SelectItem>
                    <SelectItem value="hotels.com">Hotels.com</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Guest Name (optional)</Label>
              <Input
                value={formData.guest_name}
                onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                className="bg-slate-800 border-slate-700"
                placeholder="Guest name"
              />
            </div>

            {/* Summary */}
            {nights > 0 && (
              <Card className="bg-cyan-500/10 border-cyan-500/30">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-slate-400">
                        {nights} nights × ${formData.nightly_rate} × {formData.room_count} room(s)
                      </p>
                      <p className="text-2xl font-bold text-cyan-400">${totalPrice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Avg per night</p>
                      <p className="font-medium">${(totalPrice / nights).toFixed(0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              disabled={loading || !formData.hotel_id || nights <= 0}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "Add Booking"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
