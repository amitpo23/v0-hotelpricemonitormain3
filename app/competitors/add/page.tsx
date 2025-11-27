import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { redirect } from "next/navigation"

const COMPETITOR_COLORS = [
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Teal", value: "#14b8a6" },
]

export default async function AddCompetitorPage({
  searchParams,
}: {
  searchParams: Promise<{ hotel?: string }>
}) {
  const { hotel: hotelParam } = await searchParams
  const supabase = await createClient()

  const { data: hotels } = await supabase.from("hotels").select("*").order("name")

  async function addCompetitor(formData: FormData) {
    "use server"

    const supabase = await createClient()

    const data = {
      hotel_id: formData.get("hotel_id") as string,
      competitor_hotel_name: formData.get("competitor_hotel_name") as string,
      booking_url: (formData.get("booking_url") as string) || null,
      expedia_url: (formData.get("expedia_url") as string) || null,
      competitor_url: (formData.get("competitor_url") as string) || null,
      star_rating: formData.get("star_rating") ? Number.parseInt(formData.get("star_rating") as string) : null,
      notes: (formData.get("notes") as string) || null,
      display_color: (formData.get("display_color") as string) || "#f97316",
    }

    const { data: competitor } = await supabase.from("hotel_competitors").insert(data).select().single()

    // Add room types if provided
    if (competitor) {
      const roomTypes = formData.getAll("room_type_name") as string[]
      const roomBookingUrls = formData.getAll("room_booking_url") as string[]
      const roomExpediaUrls = formData.getAll("room_expedia_url") as string[]

      for (let i = 0; i < roomTypes.length; i++) {
        if (roomTypes[i]) {
          await supabase.from("competitor_room_types").insert({
            competitor_id: competitor.id,
            name: roomTypes[i],
            booking_url: roomBookingUrls[i] || null,
            expedia_url: roomExpediaUrls[i] || null,
          })
        }
      }
    }

    redirect("/competitors")
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href="/competitors" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        ← Back to Competitors
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add Competitor Hotel</CardTitle>
          <CardDescription>
            Add a competing hotel to track its prices. Define room types for accurate comparisons.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addCompetitor} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hotel_id">Your Hotel</Label>
              <Select name="hotel_id" defaultValue={hotelParam} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select your hotel" />
                </SelectTrigger>
                <SelectContent>
                  {hotels?.map((hotel) => (
                    <SelectItem key={hotel.id} value={hotel.id}>
                      {hotel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitor_hotel_name">Competitor Hotel Name *</Label>
              <Input
                id="competitor_hotel_name"
                name="competitor_hotel_name"
                placeholder="e.g., Hilton Tel Aviv"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="star_rating">Star Rating</Label>
                <Select name="star_rating">
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Calendar Color</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COMPETITOR_COLORS.map((color) => (
                    <label key={color.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="display_color"
                        value={color.value}
                        className="sr-only peer"
                        defaultChecked={color.value === "#f97316"}
                      />
                      <div
                        className="w-6 h-6 rounded-full border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-offset-1"
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking_url">Booking.com URL</Label>
              <Input id="booking_url" name="booking_url" type="url" placeholder="https://www.booking.com/hotel/..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expedia_url">Expedia URL</Label>
              <Input id="expedia_url" name="expedia_url" type="url" placeholder="https://www.expedia.com/..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitor_url">Hotel Website</Label>
              <Input id="competitor_url" name="competitor_url" type="url" placeholder="https://www.hotel-website.com" />
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold">Room Types (Optional)</Label>
              <p className="text-sm text-muted-foreground mb-4">Add room types to compare prices by room category</p>

              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-3">
                    <Input name="room_type_name" placeholder={`Room type ${i + 1} (e.g., Standard Double)`} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input name="room_booking_url" placeholder="Booking.com URL" className="text-sm" />
                      <Input name="room_expedia_url" placeholder="Expedia URL" className="text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" placeholder="Any notes about this competitor..." rows={3} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="bg-gradient-to-r from-cyan-500 to-blue-600">
                Add Competitor
              </Button>
              <Link href="/competitors">
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
