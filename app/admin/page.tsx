"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminUserList } from "./admin-user-list"
import { AdminHotelAccess } from "./admin-hotel-access"
import { Icons } from "@/components/icons"

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [hotels, setHotels] = useState<any[]>([])
  const [hotelAccess, setHotelAccess] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        // Check auth and admin status
        const authRes = await fetch("/api/auth/check")
        const authData = await authRes.json()

        if (!authData.authenticated) {
          router.push("/auth/login")
          return
        }

        if (!authData.isAdmin) {
          router.push("/dashboard")
          return
        }

        setIsAdmin(true)

        // Fetch admin data
        const [usersRes, hotelsRes, accessRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/hotels"),
          fetch("/api/admin/hotel-access"),
        ])

        const [usersData, hotelsData, accessData] = await Promise.all([
          usersRes.json(),
          hotelsRes.json(),
          accessRes.json(),
        ])

        setUsers(usersData.users || [])
        setHotels(hotelsData.hotels || [])
        setHotelAccess(accessData.access || [])
      } catch (error) {
        console.error("Error loading admin data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Icons.spinner className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and hotel access permissions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">User Management</CardTitle>
            <CardDescription>Approve or reject user access requests</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminUserList users={users} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Hotel Access</CardTitle>
            <CardDescription>Assign users to specific hotels</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminHotelAccess hotels={hotels} users={users} hotelAccess={hotelAccess} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
