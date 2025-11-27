"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  full_name: string
  is_admin: boolean
  is_approved: boolean
}

interface Hotel {
  id: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  hotels: Hotel[]
  selectedHotel: Hotel | null
  setSelectedHotel: (hotel: Hotel | null) => void
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  hotels: [],
  selectedHotel: null,
  setSelectedHotel: () => {},
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [hotels, setHotels] = useState<Hotel[]>([])
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          setLoading(false)
          return
        }

        // Get profile
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", authUser.id).single()

        if (profile) {
          setUser({
            id: profile.id,
            email: profile.email || authUser.email || "",
            full_name: profile.full_name || "",
            is_admin: profile.is_admin || false,
            is_approved: profile.is_approved || false,
          })

          // If admin, get all hotels
          if (profile.is_admin) {
            const { data: allHotels } = await supabase.from("hotels").select("id, name").order("name")

            const hotelList = (allHotels || []).map((h) => ({ ...h, role: "admin" }))
            setHotels(hotelList)

            // Set first hotel as selected, or load from localStorage
            const savedHotelId = localStorage.getItem("selectedHotelId")
            const savedHotel = hotelList.find((h) => h.id === savedHotelId)
            setSelectedHotel(savedHotel || hotelList[0] || null)
          } else {
            // Get user's hotel access
            const { data: access } = await supabase
              .from("hotel_user_access")
              .select("hotel_id, role, hotels(id, name)")
              .eq("user_email", authUser.email)
              .eq("is_approved", true)

            const hotelList = (access || [])
              .filter((a) => a.hotels)
              .map((a) => ({
                id: (a.hotels as any).id,
                name: (a.hotels as any).name,
                role: a.role,
              }))

            setHotels(hotelList)

            // Set first hotel as selected, or load from localStorage
            const savedHotelId = localStorage.getItem("selectedHotelId")
            const savedHotel = hotelList.find((h) => h.id === savedHotelId)
            setSelectedHotel(savedHotel || hotelList[0] || null)
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchUserData()
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSetSelectedHotel = (hotel: Hotel | null) => {
    setSelectedHotel(hotel)
    if (hotel) {
      localStorage.setItem("selectedHotelId", hotel.id)
    } else {
      localStorage.removeItem("selectedHotelId")
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setHotels([])
    setSelectedHotel(null)
    localStorage.removeItem("selectedHotelId")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        hotels,
        selectedHotel,
        setSelectedHotel: handleSetSelectedHotel,
        loading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
