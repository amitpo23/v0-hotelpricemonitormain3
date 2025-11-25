import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, MapPin, DollarSign } from "lucide-react"
import Link from "next/link"
import type { Hotel } from "@/lib/types"

export default async function HotelsPage() {
  const supabase = await createClient()
  const { data: hotels, error } = await supabase.from("hotels").select("*").order("created_at", { ascending: false })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Hotels</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your hotel properties</p>
        </div>
        <Link href="/hotels/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Hotel
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 mb-6">
          <CardContent className="pt-6">
            <p className="text-red-600 dark:text-red-400">Error loading hotels: {error.message}</p>
          </CardContent>
        </Card>
      )}

      {!hotels || hotels.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MapPin className="h-16 w-16 text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No hotels yet</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-4">Get started by adding your first hotel</p>
            <Link href="/hotels/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Hotel
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel: Hotel) => (
            <Card key={hotel.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-start justify-between">
                  <span className="truncate">{hotel.name}</span>
                </CardTitle>
                {hotel.location && (
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {hotel.location}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {hotel.base_price && (
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold">${hotel.base_price}</span>
                    <span className="text-slate-500">/ night</span>
                  </div>
                )}
                <Link href={`/hotels/${hotel.id}`}>
                  <Button variant="outline" className="w-full bg-transparent">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
