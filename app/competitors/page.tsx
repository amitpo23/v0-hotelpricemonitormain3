import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Icons } from "@/components/icons"
import Link from "next/link"
import { revalidatePath } from "next/cache"

export default async function CompetitorsPage() {
  const supabase = await createClient()

  const { data: hotels } = await supabase.from("hotels").select("*").order("name")

  const { data: competitors } = await supabase
    .from("hotel_competitors")
    .select("*, hotels(name)")
    .order("competitor_hotel_name")

  const { data: competitorRoomTypes } = await supabase.from("competitor_room_types").select("*").eq("is_active", true)

  async function deleteCompetitor(formData: FormData) {
    "use server"
    const id = formData.get("id") as string
    const supabase = await createClient()
    await supabase.from("competitor_room_types").delete().eq("competitor_id", id)
    await supabase.from("hotel_competitors").delete().eq("id", id)
    revalidatePath("/competitors")
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Competitor Hotels</h1>
          <p className="text-muted-foreground mt-1">Define competing hotels to track their prices</p>
        </div>
        <Link href="/competitors/add">
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
            <Icons.plus className="w-4 h-4 mr-2" />
            Add Competitor
          </Button>
        </Link>
      </div>

      {/* Legend */}
      <Card className="mb-6 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500 mt-2" />
              <div>
                <p className="font-medium">Add Competitors</p>
                <p className="text-muted-foreground">Define hotels that compete with yours in the same market</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
              <div>
                <p className="font-medium">Automatic Scanning</p>
                <p className="text-muted-foreground">
                  We scan competitor prices every 5 hours from Booking, Expedia, etc.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-2" />
              <div>
                <p className="font-medium">Smart Recommendations</p>
                <p className="text-muted-foreground">Get AI pricing recommendations based on competitor analysis</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitors by Hotel */}
      {hotels?.map((hotel) => {
        const hotelCompetitors = competitors?.filter((c) => c.hotel_id === hotel.id) || []

        return (
          <Card key={hotel.id} className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Icons.building className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div>
                    <CardTitle>{hotel.name}</CardTitle>
                    <CardDescription>{hotel.location}</CardDescription>
                  </div>
                </div>
                <Badge variant="outline">{hotelCompetitors.length} competitors</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {hotelCompetitors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No competitors defined yet</p>
                  <Link href={`/competitors/add?hotel=${hotel.id}`}>
                    <Button variant="outline" size="sm" className="mt-2 bg-transparent">
                      <Icons.plus className="w-4 h-4 mr-2" />
                      Add First Competitor
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotelCompetitors.map((comp) => {
                    const roomTypes = competitorRoomTypes?.filter((rt) => rt.competitor_id === comp.id) || []

                    return (
                      <div
                        key={comp.id}
                        className="p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: comp.display_color || "#f97316" }}
                            />
                            <div>
                              <h3 className="font-medium">{comp.competitor_hotel_name}</h3>
                              {comp.star_rating && (
                                <div className="flex items-center gap-1 mt-1">
                                  {Array.from({ length: comp.star_rating }).map((_, i) => (
                                    <Icons.star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <form action={deleteCompetitor}>
                            <input type="hidden" name="id" value={comp.id} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Icons.trash className="w-4 h-4" />
                            </Button>
                          </form>
                        </div>

                        {roomTypes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {roomTypes.map((rt) => (
                              <Badge
                                key={rt.id}
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: rt.display_color || "#f97316" }}
                              >
                                {rt.name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {comp.booking_url && (
                            <a href={comp.booking_url} target="_blank" rel="noopener noreferrer">
                              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                                Booking <Icons.externalLink className="w-3 h-3 ml-1" />
                              </Badge>
                            </a>
                          )}
                          {comp.expedia_url && (
                            <a href={comp.expedia_url} target="_blank" rel="noopener noreferrer">
                              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                                Expedia <Icons.externalLink className="w-3 h-3 ml-1" />
                              </Badge>
                            </a>
                          )}
                        </div>

                        {comp.notes && <p className="text-sm text-muted-foreground mt-2">{comp.notes}</p>}

                        <div className="mt-3 pt-3 border-t flex gap-2">
                          <Link href={`/competitors/${comp.id}/room-types`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full bg-transparent text-xs">
                              <Icons.bed className="w-3 h-3 mr-1" />
                              Room Types ({roomTypes.length})
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {(!hotels || hotels.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No hotels found. Add a hotel first.</p>
            <Link href="/hotels/new">
              <Button>Add Hotel</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
