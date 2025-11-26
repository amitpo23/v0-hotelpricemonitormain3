import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Target, TrendingUp, AlertTriangle, CheckCircle, DollarSign } from "lucide-react"
import { BudgetForm } from "./budget-form"
import { BudgetProgress } from "./budget-progress"
import { YearlyBudgetGrid } from "./yearly-budget-grid"

export default async function BudgetPage() {
  const supabase = await createClient()

  // Get hotels
  const { data: hotels } = await supabase.from("hotels").select("*").order("name")

  const { data: allBudgets } = await supabase
    .from("revenue_budgets")
    .select("*, hotels(name)")
    .order("year", { ascending: false })
    .order("month", { ascending: true })

  // Get current month's budgets for progress tracking
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  const currentMonthBudgets = allBudgets?.filter((b) => b.year === currentYear && b.month === currentMonth) || []

  // Get revenue tracking for current month
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
  const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`

  const { data: revenue } = await supabase
    .from("revenue_tracking")
    .select("*")
    .gte("date", monthStart)
    .lte("date", monthEnd)

  // Calculate progress for each hotel
  const budgetProgress =
    currentMonthBudgets?.map((budget) => {
      const hotelRevenue = revenue?.filter((r) => r.hotel_id === budget.hotel_id) || []
      const totalRevenue = hotelRevenue.reduce((sum, r) => sum + Number(r.revenue || 0), 0)
      const totalBookings = hotelRevenue.reduce((sum, r) => sum + (r.bookings || 0), 0)
      const avgOccupancy =
        hotelRevenue.length > 0
          ? hotelRevenue.reduce((sum, r) => sum + Number(r.occupancy_rate || 0), 0) / hotelRevenue.length
          : 0

      const progress = (totalRevenue / Number(budget.target_revenue)) * 100
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
      const daysPassed = currentDate.getDate()
      const expectedProgress = (daysPassed / daysInMonth) * 100
      const onTrack = progress >= expectedProgress * 0.9

      return {
        ...budget,
        totalRevenue,
        totalBookings,
        avgOccupancy,
        progress,
        expectedProgress,
        onTrack,
        gap: Number(budget.target_revenue) - totalRevenue,
        daysRemaining: daysInMonth - daysPassed,
      }
    }) || []

  // Calculate totals
  const totalTarget = currentMonthBudgets?.reduce((sum, b) => sum + Number(b.target_revenue || 0), 0) || 0
  const totalActual = budgetProgress.reduce((sum, b) => sum + b.totalRevenue, 0)
  const overallProgress = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0
  const hotelsOnTrack = budgetProgress.filter((b) => b.onTrack).length
  const hotelsOffTrack = budgetProgress.filter((b) => !b.onTrack).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20">
              <Target className="h-8 w-8 text-cyan-400" />
            </div>
            Revenue Budget
          </h1>
          <p className="text-muted-foreground mt-1">Set targets and track progress towards your revenue goals</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Monthly Target</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-cyan-400" />${totalTarget.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Actual Revenue</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />${totalActual.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Overall Progress</CardDescription>
            <CardTitle className="text-2xl">{overallProgress.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardDescription>Hotels Status</CardDescription>
            <CardTitle className="text-lg flex items-center gap-3">
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle className="h-4 w-4" />
                {hotelsOnTrack}
              </span>
              <span className="flex items-center gap-1 text-orange-500">
                <AlertTriangle className="h-4 w-4" />
                {hotelsOffTrack}
              </span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Budget Form - now with month selector */}
      <BudgetForm hotels={hotels || []} existingBudgets={allBudgets || []} />

      <YearlyBudgetGrid hotels={hotels || []} budgets={allBudgets || []} />

      {/* Budget Progress for current month */}
      <BudgetProgress budgetProgress={budgetProgress} />
    </div>
  )
}
