import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Icons } from "@/components/icons"
import Link from "next/link"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export default async function EditCompetitorPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: competitor } = await supabase
    .from("hotel_competitors")
    .select("*, hotels(name)")
    .eq("id", params.id)
    .single()

  if (!competitor) {
    redirect("/competitors")
  }

  const { data: hotels } = await supabase.from("hotels").select("*").order("name")

  // Color options for competitors
  const colorOptions = [
    { name: "Orange", value: "#f97316" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#22c55e" },
    { name: "Purple", value: "#a855f7" },
    { name: "Pink", value: "#ec4899" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Yellow", value: "#eab308" },
    { name: "Red", value: "#ef4444" },
  ]

  async function updateCompetitor(formData: FormData) {
    "use server"

    const supabase = await createClient()

    const updateData = {
      hotel_id: formData.get("hotel_id") as string,
      competitor_hotel_name: formData.get("competitor_hotel_name") as string,
      booking_url: (formData.get("booking_url") as string) || null,
      expedia_url: (formData.get("expedia_url") as string) || null,
      star_rating: Number.parseInt(formData.get("star_rating") as string) || null,
      display_color: formData.get("display_color") as string,
      notes: (formData.get("notes") as string) || null,
    }

    const { error } = await supabase
      .from("hotel_competitors")
      .update(updateData)
      .eq("id", formData.get("id") as string)

    if (error) {
      console.error("Error updating competitor:", error)
      return
    }

    revalidatePath("/competitors")
    redirect("/competitors")
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/competitors">
          <Button variant="ghost" size="icon">
            <Icons.chevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Competitor</h1>
          <p className="text-muted-foreground mt-1">Update competitor details</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: competitor.display_color || "#f97316" }} />
            {competitor.competitor_hotel_name}
          </CardTitle>
          <CardDescription>Competing with {competitor.hotels?.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateCompetitor} className="space-y-6">
            <input type="hidden" name="id" value={competitor.id} />

            {/* Hotel Selection */}
            <div className="space-y-2">
              <Label htmlFor="hotel_id">Your Hotel</Label>
              <select
                name="hotel_id"
                id="hotel_id"
                defaultValue={competitor.hotel_id}
                className="w-full h-10 px-3 rounded-md border bg-background"
                required
              >
                {hotels?.map((hotel) => (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Competitor Name */}
            <div className="space-y-2">
              <Label htmlFor="competitor_hotel_name">Competitor Hotel Name</Label>
              <Input
                id="competitor_hotel_name"
                name="competitor_hotel_name"
                defaultValue={competitor.competitor_hotel_name}
                placeholder="e.g., Hilton Tel Aviv"
                required
              />
            </div>

            {/* Star Rating */}
            <div className="space-y-2">
              <Label htmlFor="star_rating">Star Rating</Label>
              <select
                name="star_rating"
                id="star_rating"
                defaultValue={competitor.star_rating || ""}
                className="w-full h-10 px-3 rounded-md border bg-background"
              >
                <option value="">Select rating</option>
                <option value="1">1 Star</option>
                <option value="2">2 Stars</option>
                <option value="3">3 Stars</option>
                <option value="4">4 Stars</option>
                <option value="5">5 Stars</option>
              </select>
            </div>

            {/* Display Color */}
            <div className="space-y-2">
              <Label>Display Color</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <label key={color.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="display_color"
                      value={color.value}
                      defaultChecked={competitor.display_color === color.value}
                      className="sr-only peer"
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-offset-background transition-all"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Booking URL */}
            <div className="space-y-2">
              <Label htmlFor="booking_url">
                <span className="flex items-center gap-2">
                  Booking.com URL
                  <Badge variant="secondary" className="text-xs">
                    Optional
                  </Badge>
                </span>
              </Label>
              <Input
                id="booking_url"
                name="booking_url"
                type="url"
                defaultValue={competitor.booking_url || ""}
                placeholder="https://www.booking.com/hotel/..."
              />
              <p className="text-xs text-muted-foreground">Paste the full URL from Booking.com for this competitor</p>
            </div>

            {/* Expedia URL */}
            <div className="space-y-2">
              <Label htmlFor="expedia_url">
                <span className="flex items-center gap-2">
                  Expedia URL
                  <Badge variant="secondary" className="text-xs">
                    Optional
                  </Badge>
                </span>
              </Label>
              <Input
                id="expedia_url"
                name="expedia_url"
                type="url"
                defaultValue={competitor.expedia_url || ""}
                placeholder="https://www.expedia.com/..."
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={competitor.notes || ""}
                placeholder="Any additional notes about this competitor..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600">
                <Icons.check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Link href="/competitors" className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link href={`/competitors/${competitor.id}/room-types`}>
            <Button variant="outline">
              <Icons.bed className="w-4 h-4 mr-2" />
              Manage Room Types
            </Button>
          </Link>
          {competitor.booking_url && (
            <a href={competitor.booking_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Icons.externalLink className="w-4 h-4 mr-2" />
                View on Booking
              </Button>
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
