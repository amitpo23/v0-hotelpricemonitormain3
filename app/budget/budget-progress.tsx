"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Target, Zap, AlertTriangle, CheckCircle } from "lucide-react"

interface BudgetProgressProps {
  budgetProgress: any[]
}

export function BudgetProgress({ budgetProgress }: BudgetProgressProps) {
  if (budgetProgress.length === 0) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No budgets set</h3>
          <p className="text-muted-foreground">Set your first monthly budget above to start tracking progress</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Budget Progress by Hotel</h2>

      <div className="grid gap-4">
        {budgetProgress.map((budget) => (
          <Card
            key={budget.id}
            className={`border-border/50 ${budget.onTrack ? "bg-card/50" : "bg-orange-500/5 border-orange-500/30"}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {budget.hotels?.name || "Hotel"}
                  {budget.onTrack ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      On Track
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Behind Target
                    </Badge>
                  )}
                </CardTitle>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-400">{budget.progress.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">Expected: {budget.expectedProgress.toFixed(1)}%</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Progress value={budget.progress} className="h-3" />
                  {/* Expected progress marker */}
                  <div
                    className="absolute top-0 w-0.5 h-3 bg-white/50"
                    style={{ left: `${budget.expectedProgress}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Target</div>
                  <div className="font-semibold">${Number(budget.target_revenue).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Actual</div>
                  <div className="font-semibold text-green-500">${budget.totalRevenue.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gap</div>
                  <div className={`font-semibold ${budget.gap > 0 ? "text-orange-500" : "text-green-500"}`}>
                    ${Math.abs(budget.gap).toLocaleString()}
                    {budget.gap <= 0 && " surplus"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Days Left</div>
                  <div className="font-semibold">{budget.daysRemaining}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Daily Target</div>
                  <div className="font-semibold text-cyan-400">
                    ${budget.daysRemaining > 0 ? Math.round(budget.gap / budget.daysRemaining).toLocaleString() : 0}/day
                  </div>
                </div>
              </div>

              {/* Autopilot Recommendation */}
              {!budget.onTrack && budget.gap > 0 && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    <span className="font-medium text-cyan-400">Autopilot Recommendation</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    To reach your target, you need{" "}
                    <strong className="text-foreground">
                      ${Math.round(budget.gap / budget.daysRemaining).toLocaleString()}
                    </strong>{" "}
                    per day for the remaining <strong className="text-foreground">{budget.daysRemaining} days</strong>.
                    Consider increasing prices on high-demand days or running promotions on low-occupancy periods.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Optimize Prices
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs bg-transparent">
                      <Zap className="h-3 w-3 mr-1" />
                      Enable Aggressive Mode
                    </Button>
                  </div>
                </div>
              )}

              {budget.onTrack && budget.gap <= 0 && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-400">Target Achieved!</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    You've exceeded your monthly target by{" "}
                    <strong className="text-green-400">${Math.abs(budget.gap).toLocaleString()}</strong>. Great job!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
