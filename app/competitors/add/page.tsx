import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function AddCompetitorPage({
  searchParams,
}: {
  searchParams: { hotel?: string }
}) {
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
    }

    await supabase.from("hotel_competitors").insert(data)
    redirect("/competitors")
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <Link href="/competitors" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Competitors
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add Competitor Hotel</CardTitle>
          <CardDescription>
            Add a competing hotel to track its prices. We'll scan prices from Booking.com, Expedia, and other sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addCompetitor} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="hotel_id">Your Hotel</Label>
              <Select name="hotel_id" defaultValue={searchParams.hotel} required>
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
              <Label htmlFor="booking_url">Booking.com URL</Label>
              <Input id="booking_url" name="booking_url" type="url" placeholder="https://www.booking.com/hotel/..." />
              <p className="text-xs text-muted-foreground">
                Paste the full URL from Booking.com for accurate price scanning
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expedia_url">Expedia URL</Label>
              <Input id="expedia_url" name="expedia_url" type="url" placeholder="https://www.expedia.com/..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitor_url">Hotel Website</Label>
              <Input id="competitor_url" name="competitor_url" type="url" placeholder="https://www.hotel-website.com" />
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
