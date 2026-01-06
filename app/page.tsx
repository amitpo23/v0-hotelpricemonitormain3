"use client"

import type React from "react"
import { useState } from "react"
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
  GlobeIcon,
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
  const [language, setLanguage] = useState<'en' | 'he'>('en')

  const content = {
    en: {
      badge: "AI-Powered Revenue Management",
      title1: "Smart Hotel",
      title2: "Revenue Management",
      subtitle: "Maximize revenue with AI-driven pricing decisions",
      description: "Real-time competitor analysis, 30-day price forecasting, and automated pricing recommendations powered by advanced machine learning.",
      cta1: "Get Started Free",
      cta2: "Watch Demo",
      trust1: "Enterprise Security",
      trust2: "5-Min Setup",
      trust3: "No Commitment",
      valueTitle: "Why Choose Our",
      valueHighlight: "Revenue Platform",
      valueSubtitle: "Advanced AI technology analyzing millions of data points in real-time to give you a competitive edge",
      feature1Title: "Intelligent Price Forecasting",
      feature1Desc: "Advanced algorithms analyze historical data, market trends, and local events to predict optimal prices for every night",
      feature1Badge: "Up to 95% accuracy",
      feature2Title: "Real-Time Competitor Analysis",
      feature2Desc: "Automatic scanning of Booking.com, Expedia, and other OTAs. Get instant alerts on competitor price changes",
      feature2Badge: "Updates every 15 min",
      feature3Title: "Demand Forecasting",
      feature3Desc: "Predict peak seasons, local events, and holidays. Adjust prices in advance to maximize profits",
      feature3Badge: "30-day forecast",
      feature4Title: "Full Automation",
      feature4Desc: "Enable Autopilot mode and the system updates prices automatically 24/7 based on your strategy",
      feature4Badge: "Save hours of work",
      feature5Title: "Revenue Targets",
      feature5Desc: "Set monthly revenue goals and the system adjusts pricing strategy to achieve them",
      feature5Badge: "Real-time tracking",
      feature6Title: "Analytics & Reports",
      feature6Desc: "Monitor performance over time, compare with competitors, and identify improvement opportunities",
      feature6Badge: "Data-driven insights",
      stat1Value: "25%",
      stat1Label: "Average Revenue Increase",
      stat2Value: "30+",
      stat2Label: "Days Forecast Range",
      stat3Value: "24/7",
      stat3Label: "Automated Monitoring",
      stat4Value: "95%",
      stat4Label: "Prediction Accuracy",
      processTitle: "How It Works",
      processSubtitle: "Simple process, impressive results",
      step1Title: "Data Collection",
      step1Desc: "System collects pricing from competitors, occupancy data, and information about local events",
      step2Title: "AI Analysis",
      step2Desc: "Advanced algorithms analyze the data and identify patterns and trends",
      step3Title: "Price Prediction",
      step3Desc: "System generates optimal price forecasts for every night, 30 days in advance",
      step4Title: "Action Recommendations",
      step4Desc: "Receive alerts and pricing recommendations or enable automatic updates",
    },
    he: {
      badge: "מערכת ניהול הכנסות מבוססת AI",
      title1: "ניהול הכנסות",
      title2: "חכם למלונות",
      subtitle: "מקסמו הכנסות עם החלטות תמחור מבוססות AI",
      description: "ניתוח מתחרים בזמן אמת, תחזיות מחירים ל-30 יום קדימה, והמלצות תמחור אוטומטיות מבוססות למידת מכונה מתקדמת.",
      cta1: "התחל בחינם",
      cta2: "צפה בהדגמה",
      trust1: "אבטחה ארגונית",
      trust2: "התקנה ב-5 דק'",
      trust3: "ללא התחייבות",
      valueTitle: "למה לבחור ב",
      valueHighlight: "פלטפורמת ההכנסות",
      valueSubtitle: "טכנולוגיית AI מתקדמת המנתחת מיליוני נקודות מידע בזמן אמת כדי לתת לכם יתרון תחרותי",
      feature1Title: "חיזוי מחירים חכם",
      feature1Desc: "אלגוריתמים מתקדמים מנתחים נתונים היסטוריים, מגמות שוק ואירועים מקומיים כדי לחזות את המחיר האופטימלי לכל לילה",
      feature1Badge: "דיוק של עד 95%",
      feature2Title: "ניתוח מתחרים בזמן אמת",
      feature2Desc: "סריקה אוטומטית של Booking.com, Expedia ואתרי הזמנות נוספים. קבלו התראות מיידיות על שינויי מחירים",
      feature2Badge: "עדכון כל 15 דקות",
      feature3Title: "תחזית ביקוש",
      feature3Desc: "צפו לעונות שיא, אירועים מקומיים וחגים. התאימו את המחירים מראש ומקסמו רווחים",
      feature3Badge: "תחזית ל-30 יום קדימה",
      feature4Title: "אוטומציה מלאה",
      feature4Desc: "הפעילו מצב Autopilot והמערכת תעדכן מחירים אוטומטית 24/7 לפי האסטרטגיה שהגדרתם",
      feature4Badge: "חיסכון של שעות עבודה",
      feature5Title: "יעדי הכנסה",
      feature5Desc: "הגדירו יעדי הכנסה חודשיים והמערכת תתאים את התמחור להשגתם",
      feature5Badge: "מעקב בזמן אמת",
      feature6Title: "דוחות וניתוחים",
      feature6Desc: "ראו את הביצועים שלכם לאורך זמן, השוו למתחרים וזהו הזדמנויות לשיפור",
      feature6Badge: "תובנות מבוססות נתונים",
      stat1Value: "25%",
      stat1Label: "עלייה ממוצעת בהכנסות",
      stat2Value: "30+",
      stat2Label: "ימי תחזית קדימה",
      stat3Value: "24/7",
      stat3Label: "ניטור אוטומטי",
      stat4Value: "95%",
      stat4Label: "דיוק החיזויים",
      processTitle: "איך זה עובד",
      processSubtitle: "תהליך פשוט, תוצאות מרשימות",
      step1Title: "איסוף נתונים",
      step1Desc: "המערכת אוספת נתוני מחירים ממתחרים, נתוני תפוסה ומידע על אירועים באזור",
      step2Title: "ניתוח AI",
      step2Desc: "אלגוריתמים מתקדמים מנתחים את הנתונים ומזהים דפוסים ומגמות",
      step3Title: "חיזוי מחירים",
      step3Desc: "המערכת יוצרת תחזיות מחיר אופטימליות לכל לילה ל-30 יום קדימה",
      step4Title: "המלצות פעולה",
      step4Desc: "קבלו התראות והמלצות לשינויי מחירים או הפעילו עדכון אוטומטי",
    }
  }

  const t = content[language]
  const isRTL = language === 'he'

  return (
    <div className="min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Language Switcher */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLanguage(language === 'en' ? 'he' : 'en')}
          className="bg-slate-900/80 backdrop-blur border-slate-700 hover:bg-slate-800 text-white"
        >
          <GlobeIcon className="h-4 w-4 mr-2" />
          {language === 'en' ? 'עברית' : 'English'}
        </Button>
      </div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
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
              <span>{t.badge}</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
                {t.title1}
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-blue-400 bg-clip-text text-transparent">
                {t.title2}
              </span>
            </h1>

            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-4 leading-relaxed font-semibold">
              {t.subtitle}
            </p>

            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
              {t.description}
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/auth/login">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-white px-8 py-6 text-lg rounded-xl"
                >
                  {t.cta1}
                  <ArrowRightIcon className={`${isRTL ? 'mr-2' : 'ml-2'} h-5 w-5`} />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-xl bg-transparent"
                >
                  {t.cta2}
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-8 mt-8 text-slate-500 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-emerald-500" />
                <span>{t.trust1}</span>
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-cyan-500" />
                <span>{t.trust2}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                <span>{t.trust3}</span>
              </div>
            </div>
          </div>

          {/* Main Value Proposition */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t.valueTitle}{" "}
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  {t.valueHighlight}
                </span>
                ?
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                {t.valueSubtitle}
              </p>
            </div>

            {/* Prediction Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PredictionFeatureCard
                icon={<BrainIcon className="h-10 w-10" />}
                title={t.feature1Title}
                description={t.feature1Desc}
                highlight={t.feature1Badge}
                color="cyan"
              />
              <PredictionFeatureCard
                icon={<RadarIcon className="h-10 w-10" />}
                title={t.feature2Title}
                description={t.feature2Desc}
                highlight={t.feature2Badge}
                color="emerald"
              />
              <PredictionFeatureCard
                icon={<TrendingUpIcon className="h-10 w-10" />}
                title={t.feature3Title}
                description={t.feature3Desc}
                highlight={t.feature3Badge}
                color="blue"
              />
              <PredictionFeatureCard
                icon={<BotIcon className="h-10 w-10" />}
                title={t.feature4Title}
                description={t.feature4Desc}
                highlight={t.feature4Badge}
                color="purple"
              />
              <PredictionFeatureCard
                icon={<TargetIcon className="h-10 w-10" />}
                title={t.feature5Title}
                description={t.feature5Desc}
                highlight={t.feature5Badge}
                color="orange"
              />
              <PredictionFeatureCard
                icon={<LineChartIcon className="h-10 w-10" />}
                title={t.feature6Title}
                description={t.feature6Desc}
                highlight={t.feature6Badge}
                color="pink"
              />
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid md:grid-cols-4 gap-6 mb-20">
            <InstrumentCard value={t.stat1Value} label={t.stat1Label} icon="▲" />
            <InstrumentCard value={t.stat2Value} label={t.stat2Label} icon="◐" />
            <InstrumentCard value={t.stat3Value} label={t.stat3Label} icon="●" />
            <InstrumentCard value={t.stat4Value} label={t.stat4Label} icon="✓" />
          </div>

          {/* How It Works */}
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur mb-20">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-white">{t.processTitle}</CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                {t.processSubtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-8 p-8">
              <Step
                number={1}
                title={t.step1Title}
                description={t.step1Desc}
                icon={<SearchIcon className="h-6 w-6" />}
                isRTL={isRTL}
              />
              <Step
                number={2}
                title={t.step2Title}
                description={t.step2Desc}
                icon={<BrainIcon className="h-6 w-6" />}
                isRTL={isRTL}
              />
              <Step
                number={3}
                title={t.step3Title}
                description={t.step3Desc}
                icon={<TrendingUpIcon className="h-6 w-6" />}
                isRTL={isRTL}
              />
              <Step
                number={4}
                title={t.step4Title}
                description={t.step4Desc}
                icon={<DollarSignIcon className="h-6 w-6" />}
                isRTL={isRTL}
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
  isRTL,
}: {
  number: number
  title: string
  description: string
  icon: React.ReactNode
  isRTL?: boolean
}) {
  return (
    <div className="text-center relative">
      {number < 4 && (
        <div className={`hidden md:block absolute top-7 ${isRTL ? 'right-[60%]' : 'left-[60%]'} w-[80%] h-px bg-gradient-to-r from-cyan-500/50 to-transparent`} />
      )}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-400 mb-4 relative">
        {icon}
        <div className={`absolute -top-1 ${isRTL ? '-left-1' : '-right-1'} w-5 h-5 bg-slate-900 border border-cyan-500/50 rounded-full flex items-center justify-center text-[10px] text-cyan-400 font-bold`}>
          {number}
        </div>
      </div>
      <h3 className="text-white font-semibold mb-2">{title}</h3>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  )
}
