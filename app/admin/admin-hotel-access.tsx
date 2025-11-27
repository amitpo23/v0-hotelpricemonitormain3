"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, TrashIcon } from "@/components/icons"

interface Hotel {
  id: string
  name: string
}

interface User {
  id: string
  email: string
  full_name: string
}

interface HotelAccess {
  id: string
  hotel_id: string
  user_email: string
  user_id: string | null
  role: string
  is_approved: boolean
  hotels: { name: string } | null
}

export function AdminHotelAccess({
  hotels,
  users,
  hotelAccess,
}: {
  hotels: Hotel[]
  users: User[]
  hotelAccess: HotelAccess[]
}) {
  const [selectedHotel, setSelectedHotel] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("viewer")
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleAddAccess = async () => {
    if (!selectedHotel || !email) return

    setLoading(true)

    // Find user by email
    const user = users.find((u) => u.email === email)

    await supabase.from("hotel_user_access").upsert({
      hotel_id: selectedHotel,
      user_email: email,
      user_id: user?.id || null,
      role,
      is_approved: true,
      approved_at: new Date().toISOString(),
    })

    // If user exists, also approve their profile
    if (user) {
      await supabase.from("profiles").update({ is_approved: true }).eq("id", user.id)
    }

    setEmail("")
    setSelectedHotel("")
    setRole("viewer")
    router.refresh()
    setLoading(false)
  }

  const handleRemoveAccess = async (accessId: string) => {
    setDeleteLoading(accessId)
    await supabase.from("hotel_user_access").delete().eq("id", accessId)

    router.refresh()
    setDeleteLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Add new access form */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
        <h4 className="font-medium text-foreground">Grant Hotel Access</h4>

        <Select value={selectedHotel} onValueChange={setSelectedHotel}>
          <SelectTrigger className="bg-background border-border">
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

        <Input
          type="email"
          placeholder="User email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-background border-border"
        />

        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleAddAccess}
          disabled={loading || !selectedHotel || !email}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          {loading ? "Adding..." : "Grant Access"}
        </Button>
      </div>

      {/* Access list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {hotelAccess.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No access records</p>
        ) : (
          hotelAccess.map((access) => (
            <div
              key={access.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{access.user_email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {access.hotels?.name || "Unknown Hotel"}
                  </Badge>
                  <Badge className="text-xs bg-blue-500/20 text-blue-400">{access.role}</Badge>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveAccess(access.id)}
                disabled={deleteLoading === access.id}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
