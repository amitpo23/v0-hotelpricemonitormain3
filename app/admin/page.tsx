import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminUserList } from "./admin-user-list"
import { AdminHotelAccess } from "./admin-hotel-access"

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single()

  if (!profile?.is_admin) {
    redirect("/dashboard")
  }

  // Fetch all users
  const { data: users } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

  // Fetch all hotels
  const { data: hotels } = await supabase.from("hotels").select("*").order("name")

  // Fetch hotel access records
  const { data: hotelAccess } = await supabase
    .from("hotel_user_access")
    .select("*, hotels(name)")
    .order("created_at", { ascending: false })

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
            <AdminUserList users={users || []} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Hotel Access</CardTitle>
            <CardDescription>Assign users to specific hotels</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminHotelAccess hotels={hotels || []} users={users || []} hotelAccess={hotelAccess || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
