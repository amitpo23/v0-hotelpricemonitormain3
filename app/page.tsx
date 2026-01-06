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
  TrendingUpIcon,
  LineChartIcon,
  CheckCircleIcon,
  ZapIcon,
  ShieldIcon,
  ClockIcon,
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

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30 text-cyan-400 text-sm mb-6">
              <ZapIcon className="h-4 w-4" />
              <span>מערכת חיזוי מחירים מבוססת AI</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                Hotel Revenue
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Intelligence Platform
              </span>
            </h1>

            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-4 leading-relaxed">
              <span className="text-cyan-400 font-semibold">הגדילו את ההכנסות עד 25%</span> עם מערכת החיזוי המתקדמת שלנו.
              <br />
              ניתוח מתחרים בזמן אמת, תחזיות מחירים ל-30 יום קדימה, והמלצות תמחור אוטומטיות.
            </p>

            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              המערכת מנתחת את השוק, מבינה את הביקוש העתידי, ומספקת לכם 
              <span className="text-emerald-400 font-semibold"> החלטות תמחור חכמות </span> 
              בכל רגע נתון.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/auth/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white px-8 py-6 text-lg rounded-xl"
                >
                  התחל עכשיו - בחינם
                  <ArrowRightIcon className="mr-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-xl bg-transparent"
                >
                  צפה בהדגמה
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-8 mt-8 text-slate-500 text-sm">
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-emerald-500" />
                <span>אבטחה מתקדמת</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-cyan-500" />
                <span>התקנה ב-5 דקות</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                <span>ללא התחייבות</span>
              </div>
            </div>
          </div>

          {/* Main Value Proposition */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                למה מערכת 
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent"> החיזוי </span>
                שלנו?
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                טכנולוגיית AI מתקדמת שמנתחת מיליוני נקודות מידע בזמן אמת כדי לתת לכם יתרון תחרותי
              </p>
            </div>

            {/* Prediction Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PredictionFeatureCard
                icon={<BrainIcon className="h-10 w-10" />}
                title="חיזוי מחירים חכם"
                description="אלגוריתמים מתקדמים מנתחים נתונים היסטוריים, מגמות שוק ואירועים מקומיים כדי לחזות את המחיר האופטימלי לכל לילה"
                highlight="דיוק של עד 95%"
                color="cyan"
              />
              <PredictionFeatureCard
                icon={<RadarIcon className="h-10 w-10" />}
                title="ניתוח מתחרים בזמן אמת"
                description="סריקה אוטומטית של Booking.com, Expedia ואתרי הזמנות נוספים. קבלו התראות מיידיות על שינויי מחירים"
                highlight="עדכון כל 15 דקות"
                color="emerald"
              />
              <PredictionFeatureCard
                icon={<TrendingUpIcon className="h-10 w-10" />}
                title="תחזית ביקוש"
                description="צפו לעונות שיא, אירועים מקומיים וחגים. התאימו את המחירים מראש ומקסמו רווחים"
                highlight="תחזית ל-30 יום קדימה"
                color="blue"
              />
              <PredictionFeatureCard
                icon={<BotIcon className="h-10 w-10" />}
                title="אוטומציה מלאה"
                description="הפעילו מצב Autopilot והמערכת תעדכן מחירים אוטומטית 24/7 לפי האסטרטגיה שהגדרתם"
                highlight="חיסכון של שעות עבודה"
                color="purple"
              />
              <PredictionFeatureCard
                icon={<TargetIcon className="h-10 w-10" />}
                title="יעדי הכנסה"
                description="הגדירו יעדי הכנסה חודשיים והמערכת תתאים את התמחור להשגתם"
                highlight="מעקב בזמן אמת"
                color="orange"
              />
              <PredictionFeatureCard
                icon={<LineChartIcon className="h-10 w-10" />}
                title="דוחות וניתוחים"
                description="ראו את הביצועים שלכם לאורך זמן, השוו למתחרים וזהו הזדמנויות לשיפור"
                highlight="תובנות מבוססות נתונים"
                color="pink"
              />
            </div>
          </div>

          {/* Stats Section - Flight instruments style */}
          <div className="grid md:grid-cols-4 gap-6 mb-20">
            <InstrumentCard value="25%" label="עלייה ממוצעת בהכנסות" icon="▲" />
            <InstrumentCard value="30+" label="ימי תחזית קדימה" icon="◐" />
            <InstrumentCard value="24/7" label="ניטור אוטומטי" icon="●" />
            <InstrumentCard value="95%" label="דיוק החיזויים" icon="✓" />
          </div>

          {/* How Prediction Works */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur mb-20">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-white">איך מערכת החיזוי עובדת?</CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                תהליך פשוט, תוצאות מרשימות
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-8 p-8">
              <Step
                number={1}
                title="איסוף נתונים"
                description="המערכת אוספת נתוני מחירים ממתחרים, נתוני תפוסה ומידע על אירועים באזור"
                icon={<SearchIcon className="h-6 w-6" />}
              />
              <Step
                number={2}
                title="ניתוח AI"
                description="אלגוריתמים מתקדמים מנתחים את הנתונים ומזהים דפוסים ומגמות"
                icon={<BrainIcon className="h-6 w-6" />}
              />
              <Step
                number={3}
                title="חיזוי מחירים"
                description="המערכת יוצרת תחזיות מחיר אופטימליות לכל לילה ל-30 יום קדימה"
                icon={<TrendingUpIcon className="h-6 w-6" />}
              />
              <Step
                number={4}
                title="המלצות פעולה"
                description="קבלו התראות והמלצות לשינויי מחירים או הפעילו עדכון אוטומטי"
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

function PredictionFeatureCard({
  icon,
  title,
  description,
  highlight,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  highlight: string
  color: "cyan" | "emerald" | "blue" | "purple" | "orange" | "pink"
}) {
  const colors = {
    cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
    emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400",
    blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
    orange: "from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400",
    pink: "from-pink-500/20 to-pink-500/5 border-pink-500/20 text-pink-400",
  }

  return (
    <Card
      className={`bg-gradient-to-b ${colors[color]} border backdrop-blur group hover:scale-105 transition-all duration-300`}
    >
      <CardHeader>
        <div className={colors[color].split(" ").slice(-1)[0]}>{icon}</div>
        <CardTitle className="text-white text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-slate-400 text-sm leading-relaxed mb-4">{description}</p>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
          <span className={colors[color].split(" ").slice(-1)[0]}>✦</span>
          <span className="text-white">{highlight}</span>
        </div>
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
