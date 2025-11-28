"use client"

import type React from "react"
import "./globals.css"
import Link from "next/link"
import {
  IconSearch,
  IconBell,
  IconDashboard,
  IconBot,
  IconChart,
  IconBuilding,
  IconCalendar,
  IconTarget,
  IconUsers,
  IconBook,
  ShieldIcon,
  LogOutIcon,
  ChevronDownIcon,
} from "@/components/icons"
import { usePathname, useRouter } from "next/navigation"
import { Suspense } from "react"
import { useAuth, AuthProvider } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function CockpitIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 12l3-3" />
    </svg>
  )
}

function NavContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, hotels, selectedHotel, setSelectedHotel, signOut, loading } = useAuth()

  // Don't show nav on auth pages
  const isAuthPage = pathname?.startsWith("/auth")
  const isLandingPage = pathname === "/"
  if (isAuthPage || isLandingPage) {
    return <>{children}</>
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/auth/login")
  }

  return (
    <>
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-slate-900 border border-cyan-500/30 p-2 rounded-lg">
                <CockpitIcon className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight">Cockpit</span>
            </div>
          </Link>

          <div className="flex items-center gap-0.5">
            <NavLink href="/dashboard" icon={<IconDashboard className="h-4 w-4" />} label="Dashboard" />
            <NavLink href="/calendar" icon={<IconCalendar className="h-4 w-4" />} label="Calendar" />
            <NavLink href="/budget" icon={<IconTarget className="h-4 w-4" />} label="Budget" />
            <NavLink href="/bookings" icon={<IconBook className="h-4 w-4" />} label="Bookings" />
            <NavLink href="/hotels" icon={<IconBuilding className="h-4 w-4" />} label="Properties" />
            <NavLink href="/competitors" icon={<IconUsers className="h-4 w-4" />} label="Competitors" />
            <NavLink href="/scans" icon={<IconSearch className="h-4 w-4" />} label="Radar" />
            <NavLink href="/autopilot" icon={<IconBot className="h-4 w-4" />} label="Autopilot" highlight />
            <NavLink href="/predictions" icon={<IconChart className="h-4 w-4" />} label="Predictions" />
            <NavLink href="/alerts" icon={<IconBell className="h-4 w-4" />} label="Alerts" />
            {user?.is_admin && (
              <NavLink href="/admin" icon={<ShieldIcon className="h-4 w-4" />} label="Admin" highlight />
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Hotel Selector */}
            {hotels.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-slate-700 bg-slate-900/50 text-sm">
                    <IconBuilding className="h-4 w-4 mr-2 text-cyan-400" />
                    {selectedHotel?.name || "Select Hotel"}
                    <ChevronDownIcon className="h-4 w-4 ml-2 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {hotels.map((hotel) => (
                    <DropdownMenuItem
                      key={hotel.id}
                      onClick={() => setSelectedHotel(hotel)}
                      className={selectedHotel?.id === hotel.id ? "bg-cyan-500/10 text-cyan-400" : ""}
                    >
                      {hotel.name}
                      <span className="ml-auto text-xs text-muted-foreground">{hotel.role}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-sm text-slate-300 hover:text-white">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 flex items-center justify-center text-white font-medium mr-2">
                      {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <ChevronDownIcon className="h-4 w-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.full_name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {user.is_admin && (
                      <span className="inline-block mt-1 text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-red-400">
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </nav>
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">{children}</main>
    </>
  )
}

export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      }
    >
      <AuthProvider>
        <NavContent>{children}</NavContent>
      </AuthProvider>
    </Suspense>
  )
}

function NavLink({
  href,
  icon,
  label,
  highlight,
}: {
  href: string
  icon: React.ReactNode
  label: string
  highlight?: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname?.startsWith(href + "/")

  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm
        ${
          isActive
            ? "bg-slate-800 text-white"
            : highlight
              ? "bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 text-cyan-400 hover:from-cyan-500/20 hover:to-emerald-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
        }`}
    >
      {icon}
      {label}
    </Link>
  )
}
