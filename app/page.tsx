import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  PlaneIcon,
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

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl rounded-full" />

        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center mb-16">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 blur-2xl opacity-50" />
                <div className="relative bg-gradient-to-r from-cyan-500 to-blue-500 p-4 rounded-2xl">
                  <PlaneIcon className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                Revenue on
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Autopilot
              </span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              AI-powered revenue management that analyzes competitors, predicts demand, and automatically optimizes your
              hotel pricing for maximum profit.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg rounded-xl"
                >
                  Launch Dashboard
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/hotels">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-xl bg-transparent"
                >
                  Add Property
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <FeatureCard
              icon={<RadarIcon className="h-8 w-8" />}
              title="Competitor Scanning"
              description="Real-time monitoring of competitor prices from booking.com, Expedia, and direct channels"
              color="cyan"
            />
            <FeatureCard
              icon={<BrainIcon className="h-8 w-8" />}
              title="AI Predictions"
              description="Machine learning models predict demand and optimal pricing 30 days ahead"
              color="blue"
            />
            <FeatureCard
              icon={<BotIcon className="h-8 w-8" />}
              title="Smart Automation"
              description="Set rules and let Autopilot adjust prices automatically based on market conditions"
              color="purple"
            />
            <FeatureCard
              icon={<TargetIcon className="h-8 w-8" />}
              title="Revenue Targets"
              description="Define revenue goals and occupancy targets - we optimize to achieve them"
              color="pink"
            />
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <StatCard value="24/7" label="Monitoring" />
            <StatCard value="30+" label="Days Forecast" />
            <StatCard value="15%" label="Avg Revenue Boost" />
            <StatCard value="<1s" label="Response Time" />
          </div>

          {/* How It Works */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-white">How Autopilot Works</CardTitle>
              <CardDescription className="text-slate-400 text-lg">Set it up once, optimize forever</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-8 p-8">
              <Step
                number={1}
                title="Connect Properties"
                description="Add your hotels and connect to your property management system"
                icon={<BuildingIcon className="h-6 w-6" />}
              />
              <Step
                number={2}
                title="Scan Competitors"
                description="Set up automated scans to monitor competitor pricing continuously"
                icon={<SearchIcon className="h-6 w-6" />}
              />
              <Step
                number={3}
                title="Define Rules"
                description="Create pricing rules with min/max bounds and revenue targets"
                icon={<GaugeIcon className="h-6 w-6" />}
              />
              <Step
                number={4}
                title="Maximize Revenue"
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
  color: "cyan" | "blue" | "purple" | "pink"
}) {
  const colors = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
    pink: "from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-400",
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

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
      <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
        {value}
      </div>
      <div className="text-slate-400">{label}</div>
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
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 mb-4">
        {icon}
      </div>
      <div className="text-xs text-cyan-400 font-semibold mb-2">STEP {number}</div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  )
}
