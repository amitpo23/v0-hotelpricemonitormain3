import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"

const ROOM_COLORS = [
  { name: "Cyan", value: "#06b6d4" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
]

export default async function HotelRoomTypesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: hotel, error } = await supabase.from("hotels").select("*").eq("id", id).single()

  if (error || !hotel) {
    notFound()
  }

  const { data: roomTypes } = await supabase
    .from("hotel_room_types")
    .select("*")
    .eq("hotel_id", id)
    .order("created_at", { ascending: true })

  async function addRoomType(formData: FormData) {
    "use server"
    const supabase = await createClient()

    await supabase.from("hotel_room_types").insert({
      hotel_id: formData.get("hotel_id") as string,
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      base_price: formData.get("base_price") ? Number(formData.get("base_price")) : null,
      booking_url: (formData.get("booking_url") as string) || null,
      expedia_url: (formData.get("expedia_url") as string) || null,
      agoda_url: (formData.get("agoda_url") as string) || null,
      hotels_com_url: (formData.get("hotels_com_url") as string) || null,
      display_color: (formData.get("display_color") as string) || "#06b6d4",
    })

    redirect(`/hotels/${formData.get("hotel_id")}/room-types`)
  }

  async function deleteRoomType(formData: FormData) {
    "use server"
    const supabase = await createClient()
    const roomTypeId = formData.get("room_type_id") as string
    const hotelId = formData.get("hotel_id") as string
    await supabase.from("hotel_room_types").delete().eq("id", roomTypeId)
    redirect(`/hotels/${hotelId}/room-types`)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/hotels/${id}`} className="text-muted-foreground hover:text-foreground text-sm mb-2 block">
            ← Back to {hotel.name}
          </Link>
          <h1 className="text-3xl font-bold">Room Types</h1>
          <p className="text-muted-foreground">Manage room types for {hotel.name}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add Room Type Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Room Type</CardTitle>
            <CardDescription>Define room types with URLs for price scanning</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addRoomType} className="space-y-4">
              <input type="hidden" name="hotel_id" value={id} />

              <div className="space-y-2">
                <Label htmlFor="name">Room Type Name *</Label>
                <Input id="name" name="name" placeholder="e.g., Standard Double, Deluxe Suite" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_price">Base Price ($)</Label>
                <Input id="base_price" name="base_price" type="number" placeholder="150" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Room description..." />
              </div>

              <div className="space-y-2">
                <Label>Display Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ROOM_COLORS.map((color) => (
                    <label key={color.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="display_color"
                        value={color.value}
                        className="sr-only peer"
                        defaultChecked={color.value === "#06b6d4"}
                      />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-white peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-offset-background"
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Booking URLs (for scanning)</h4>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="booking_url" className="text-sm">
                      Booking.com URL
                    </Label>
                    <Input
                      id="booking_url"
                      name="booking_url"
                      type="url"
                      placeholder="https://www.booking.com/hotel/..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="expedia_url" className="text-sm">
                      Expedia URL
                    </Label>
                    <Input
                      id="expedia_url"
                      name="expedia_url"
                      type="url"
                      placeholder="https://www.expedia.com/..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="agoda_url" className="text-sm">
                      Agoda URL
                    </Label>
                    <Input
                      id="agoda_url"
                      name="agoda_url"
                      type="url"
                      placeholder="https://www.agoda.com/..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="hotels_com_url" className="text-sm">
                      Hotels.com URL
                    </Label>
                    <Input
                      id="hotels_com_url"
                      name="hotels_com_url"
                      type="url"
                      placeholder="https://www.hotels.com/..."
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600">
                Add Room Type
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Room Types */}
        <Card>
          <CardHeader>
            <CardTitle>Current Room Types</CardTitle>
            <CardDescription>{roomTypes?.length || 0} room types configured</CardDescription>
          </CardHeader>
          <CardContent>
            {!roomTypes || roomTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No room types defined yet</p>
                <p className="text-sm mt-1">Add your first room type to start scanning by room</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roomTypes.map((rt) => (
                  <div key={rt.id} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: rt.display_color || "#06b6d4" }}
                        />
                        <div>
                          <div className="font-medium">{rt.name}</div>
                          {rt.base_price && <div className="text-sm text-muted-foreground">${rt.base_price}/night</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rt.is_active ? "default" : "secondary"}>
                          {rt.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <form action={deleteRoomType}>
                          <input type="hidden" name="room_type_id" value={rt.id} />
                          <input type="hidden" name="hotel_id" value={id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </Button>
                        </form>
                      </div>
                    </div>
                    {rt.description && <p className="text-sm text-muted-foreground mt-2">{rt.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {rt.booking_url && (
                        <Badge variant="outline" className="text-xs">
                          Booking.com
                        </Badge>
                      )}
                      {rt.expedia_url && (
                        <Badge variant="outline" className="text-xs">
                          Expedia
                        </Badge>
                      )}
                      {rt.agoda_url && (
                        <Badge variant="outline" className="text-xs">
                          Agoda
                        </Badge>
                      )}
                      {rt.hotels_com_url && (
                        <Badge variant="outline" className="text-xs">
                          Hotels.com
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
