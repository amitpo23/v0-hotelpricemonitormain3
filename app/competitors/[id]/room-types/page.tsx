"use client"

import { useState, useEffect, use } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/icons"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface RoomType {
  id: string
  name: string
  booking_url: string | null
  expedia_url: string | null
  agoda_url: string | null
  hotels_com_url: string | null
  display_color: string
  is_active: boolean
}

interface Competitor {
  id: string
  competitor_hotel_name: string
  hotel_id: string
}

const PRESET_COLORS = [
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#3b82f6",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#78716c",
]

export default function CompetitorRoomTypesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [competitor, setCompetitor] = useState<Competitor | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [newRoomType, setNewRoomType] = useState({
    name: "",
    booking_url: "",
    expedia_url: "",
    agoda_url: "",
    hotels_com_url: "",
    display_color: "#f97316",
  })

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const supabase = createClient()

    const { data: comp } = await supabase.from("hotel_competitors").select("*").eq("id", id).single()

    if (comp) {
      setCompetitor(comp)
    }

    const { data: types } = await supabase
      .from("competitor_room_types")
      .select("*")
      .eq("competitor_id", id)
      .order("name")

    if (types) {
      setRoomTypes(types)
    }

    setLoading(false)
  }

  async function addRoomType() {
    if (!newRoomType.name.trim()) return

    setSaving(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("competitor_room_types")
      .insert({
        competitor_id: id,
        name: newRoomType.name,
        booking_url: newRoomType.booking_url || null,
        expedia_url: newRoomType.expedia_url || null,
        agoda_url: newRoomType.agoda_url || null,
        hotels_com_url: newRoomType.hotels_com_url || null,
        display_color: newRoomType.display_color,
      })
      .select()
      .single()

    if (data) {
      setRoomTypes([...roomTypes, data])
      setNewRoomType({
        name: "",
        booking_url: "",
        expedia_url: "",
        agoda_url: "",
        hotels_com_url: "",
        display_color: PRESET_COLORS[roomTypes.length % PRESET_COLORS.length],
      })
    }

    setSaving(false)
  }

  async function deleteRoomType(roomTypeId: string) {
    const supabase = createClient()
    await supabase.from("competitor_room_types").delete().eq("id", roomTypeId)
    setRoomTypes(roomTypes.filter((rt) => rt.id !== roomTypeId))
  }

  async function toggleRoomType(roomTypeId: string, isActive: boolean) {
    const supabase = createClient()
    await supabase.from("competitor_room_types").update({ is_active: !isActive }).eq("id", roomTypeId)
    setRoomTypes(roomTypes.map((rt) => (rt.id === roomTypeId ? { ...rt, is_active: !isActive } : rt)))
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <Icons.spinner className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  if (!competitor) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Competitor not found</p>
            <Link href="/competitors">
              <Button variant="outline" className="mt-4 bg-transparent">
                Back to Competitors
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/competitors">
          <Button variant="ghost" size="icon" className="bg-transparent">
            <Icons.arrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{competitor.competitor_hotel_name}</h1>
          <p className="text-muted-foreground">Manage room types for price tracking</p>
        </div>
      </div>

      {/* Add Room Type Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.plus className="w-5 h-5" />
            Add Room Type
          </CardTitle>
          <CardDescription>Add room types with specific URLs to track prices for each room category</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Room Type Name *</Label>
              <Input
                placeholder="e.g., Standard Room, Deluxe Suite"
                value={newRoomType.name}
                onChange={(e) => setNewRoomType({ ...newRoomType, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Display Color</Label>
              <div className="flex gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full transition-transform ${newRoomType.display_color === color ? "ring-2 ring-white scale-110" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewRoomType({ ...newRoomType, display_color: color })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Booking.com URL</Label>
              <Input
                placeholder="https://www.booking.com/..."
                value={newRoomType.booking_url}
                onChange={(e) => setNewRoomType({ ...newRoomType, booking_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Expedia URL</Label>
              <Input
                placeholder="https://www.expedia.com/..."
                value={newRoomType.expedia_url}
                onChange={(e) => setNewRoomType({ ...newRoomType, expedia_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Agoda URL</Label>
              <Input
                placeholder="https://www.agoda.com/..."
                value={newRoomType.agoda_url}
                onChange={(e) => setNewRoomType({ ...newRoomType, agoda_url: e.target.value })}
              />
            </div>
            <div>
              <Label>Hotels.com URL</Label>
              <Input
                placeholder="https://www.hotels.com/..."
                value={newRoomType.hotels_com_url}
                onChange={(e) => setNewRoomType({ ...newRoomType, hotels_com_url: e.target.value })}
              />
            </div>
          </div>

          <Button
            onClick={addRoomType}
            disabled={!newRoomType.name.trim() || saving}
            className="bg-gradient-to-r from-cyan-500 to-blue-600"
          >
            {saving ? <Icons.spinner className="w-4 h-4 mr-2 animate-spin" /> : <Icons.plus className="w-4 h-4 mr-2" />}
            Add Room Type
          </Button>
        </CardContent>
      </Card>

      {/* Room Types List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.bed className="w-5 h-5" />
            Room Types ({roomTypes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roomTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icons.bed className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No room types defined yet</p>
              <p className="text-sm">Add room types above to start tracking prices</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roomTypes.map((rt) => (
                <div
                  key={rt.id}
                  className={`p-4 rounded-lg border ${rt.is_active ? "bg-card/50" : "bg-muted/20 opacity-60"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: rt.display_color }} />
                      <div>
                        <h3 className="font-medium">{rt.name}</h3>
                        <div className="flex gap-2 mt-1">
                          {rt.booking_url && (
                            <Badge variant="outline" className="text-xs">
                              Booking
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
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRoomType(rt.id, rt.is_active)}
                        className="bg-transparent"
                      >
                        {rt.is_active ? (
                          <>
                            <Icons.check className="w-4 h-4 mr-1 text-green-500" /> Active
                          </>
                        ) : (
                          <>
                            <Icons.x className="w-4 h-4 mr-1 text-muted-foreground" /> Inactive
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRoomType(rt.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Icons.trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
