"use client"

import type React from "react"
import "./globals.css"
import Link from "next/link"
import {
  Search,
  Bell,
  LayoutDashboard,
  Bot,
  LineChart,
  Building2,
  Plane,
  CalendarDays,
  Target,
  Users,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { Suspense } from "react"

export function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-to-r from-cyan-500 to-blue-500 p-2 rounded-lg">
                <Plane className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight">Autopilot</span>
              <span className="text-[10px] ml-1.5 px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-medium">
                AI
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-0.5">
            <NavLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" />
            <NavLink href="/calendar" icon={<CalendarDays className="h-4 w-4" />} label="Calendar" />
            <NavLink href="/budget" icon={<Target className="h-4 w-4" />} label="Budget" />
            <NavLink href="/hotels" icon={<Building2 className="h-4 w-4" />} label="Properties" />
            <NavLink href="/competitors" icon={<Users className="h-4 w-4" />} label="Competitors" />
            <NavLink href="/scans" icon={<Search className="h-4 w-4" />} label="Scans" />
            <NavLink href="/autopilot" icon={<Bot className="h-4 w-4" />} label="Rules" highlight />
            <NavLink href="/predictions" icon={<LineChart className="h-4 w-4" />} label="Predictions" />
            <NavLink href="/alerts" icon={<Bell className="h-4 w-4" />} label="Alerts" />
          </div>

          <div className="w-24" />
        </div>
      </nav>
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">{children}</main>
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
              ? "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
        }`}
    >
      {icon}
      {label}
    </Link>
  )
}
