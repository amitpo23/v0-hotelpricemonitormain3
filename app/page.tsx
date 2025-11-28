import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  SearchIcon,
  BuildingIcon,
  BotIcon,
  TargetIcon,
  ArrowRightIcon,
  BrainIcon,
  RadarIcon,
  GaugeIcon,
  DollarSignIcon,
} from "@/components/icons"

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

function AutopilotIcon({ className }: { className?: string }) {
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
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects - Cockpit radar style */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-emerald-500/20 blur-3xl rounded-full" />

        {/* Radar circles animation */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-10">
          <div
            className="absolute inset-0 border border-cyan-500 rounded-full animate-ping"
            style={{ animationDuration: "3s" }}
          />
          <div
            className="absolute inset-[50px] border border-cyan-500 rounded-full animate-ping"
            style={{ animationDuration: "3s", animationDelay: "0.5s" }}
          />
          <div
            className="absolute inset-[100px] border border-cyan-500 rounded-full animate-ping"
            style={{ animationDuration: "3s", animationDelay: "1s" }}
          />
        </div>

        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center mb-16">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-emerald-500 blur-2xl opacity-50" />
                <div className="relative bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl border border-cyan-500/30">
                  <CockpitIcon className="h-12 w-12 text-cyan-400" />
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                Welcome to the
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Cockpit
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
              Your hotel revenue command center. Set your destination, engage
              <span className="text-cyan-400 font-semibold"> Autopilot</span>, and watch your revenue soar.
            </p>

            <p className="text-sm text-slate-500 max-w-xl mx-auto mb-10">
              Navigate pricing decisions with real-time market data, competitor intelligence, and AI-powered
              optimization that flies your hotel to maximum profitability.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/auth/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white px-8 py-6 text-lg rounded-xl"
                >
                  Enter Cockpit
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-xl bg-transparent"
                >
                  Request Access
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <FeatureCard
              icon={<RadarIcon className="h-8 w-8" />}
              title="Radar Scanning"
              description="Real-time monitoring of competitor prices from Booking.com and Expedia"
              color="cyan"
            />
            <FeatureCard
              icon={<BrainIcon className="h-8 w-8" />}
              title="Flight Planning"
              description="AI predictions map out optimal pricing 30 days ahead"
              color="emerald"
            />
            <FeatureCard
              icon={<BotIcon className="h-8 w-8" />}
              title="Autopilot Mode"
              description="Set your revenue target and let Autopilot navigate there automatically"
              color="blue"
            />
            <FeatureCard
              icon={<TargetIcon className="h-8 w-8" />}
              title="Target Lock"
              description="Define revenue goals and occupancy targets - we lock on and achieve them"
              color="purple"
            />
          </div>

          {/* Stats Section - Flight instruments style */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <InstrumentCard value="24/7" label="Radar Active" icon="●" />
            <InstrumentCard value="30+" label="Days Visibility" icon="◐" />
            <InstrumentCard value="15%" label="Avg. Altitude Gain" icon="▲" />
            <InstrumentCard value="<1s" label="Response Time" icon="⚡" />
          </div>

          {/* How It Works - Flight plan */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-white">Your Flight Plan</CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                Configure once, optimize continuously
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-8 p-8">
              <Step
                number={1}
                title="Pre-Flight Check"
                description="Add your hotels and connect your property management system"
                icon={<BuildingIcon className="h-6 w-6" />}
              />
              <Step
                number={2}
                title="Radar Setup"
                description="Configure competitor scanning to monitor market conditions"
                icon={<SearchIcon className="h-6 w-6" />}
              />
              <Step
                number={3}
                title="Set Course"
                description="Define pricing rules, min/max bounds, and revenue targets"
                icon={<GaugeIcon className="h-6 w-6" />}
              />
              <Step
                number={4}
                title="Engage Autopilot"
                description="Autopilot optimizes pricing 24/7 while you focus on guests"
                icon={<DollarSignIcon className="h-6 w-6" />}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: "cyan" | "emerald" | "blue" | "purple"
}) {
  const colors = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
  }

  return (
    <Card
      className={`bg-gradient-to-b ${colors[color]} border backdrop-blur group hover:scale-105 transition-transform`}
    >
      <CardHeader>
        <div className={colors[color].split(" ").slice(-1)[0]}>{icon}</div>
        <CardTitle className="text-white text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  )
}

function InstrumentCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800 relative overflow-hidden">
      <div className="absolute top-2 right-2 text-cyan-500/50 text-xs">{icon}</div>
      <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent mb-2 font-mono">
        {value}
      </div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  )
}

function Step({
  number,
  title,
  description,
  icon,
}: {
  number: number
  title: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <div className="text-center relative">
      {number < 4 && (
        <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-cyan-500/50 to-transparent" />
      )}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-400 mb-4 relative">
        {icon}
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-900 border border-cyan-500/50 rounded-full flex items-center justify-center text-[10px] text-cyan-400 font-bold">
          {number}
        </div>
      </div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  )
}
