"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2Icon, InfoIcon } from "@/components/icons"

interface Hotel {
  id: string
  name: string
}

export function AutopilotRuleForm({ hotels }: { hotels: Hotel[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    hotel_id: "",
    trigger_type: "competitor_undercut",
    trigger_value: { threshold: 5 },
    action_type: "adjust_price",
    action_value: { adjustment: -5, adjustment_type: "percentage" },
    min_price: "",
    max_price: "",
    max_daily_changes: 3,
    target_revenue: "",
    target_occupancy: "",
    priority: 1,
    is_active: true,
    booking_pace_threshold: "",
    budget_variance_threshold: "",
    days_ahead_threshold: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          min_price: formData.min_price ? Number(formData.min_price) : null,
          max_price: formData.max_price ? Number(formData.max_price) : null,
          target_revenue: formData.target_revenue ? Number(formData.target_revenue) : null,
          target_occupancy: formData.target_occupancy ? Number(formData.target_occupancy) : null,
          trigger_value: {
            ...formData.trigger_value,
            booking_pace_threshold: formData.booking_pace_threshold ? Number(formData.booking_pace_threshold) : null,
            budget_variance_threshold: formData.budget_variance_threshold
              ? Number(formData.budget_variance_threshold)
              : null,
            days_ahead_threshold: formData.days_ahead_threshold ? Number(formData.days_ahead_threshold) : null,
          },
        }),
      })

      if (res.ok) {
        router.push("/autopilot")
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const getTriggerDescription = (type: string) => {
    switch (type) {
      case "competitor_undercut":
        return "הפעל כשמתחרה מפחית מחיר מתחת לסף מוגדר"
      case "occupancy_threshold":
        return "הפעל כשתפוסה עולה/יורדת מהסף המוגדר"
      case "demand_spike":
        return "הפעל כשמזהה עלייה חדה בביקוש"
      case "date_range":
        return "הפעל בטווח תאריכים מוגדר"
      case "booking_pace_below_budget":
        return "הפעל כשקצב ההזמנות נמוך מהתקציב - להורדת מחיר"
      case "booking_pace_above_budget":
        return "הפעל כשקצב ההזמנות גבוה מהתקציב - להעלאת מחיר"
      case "low_occupancy_near_date":
        return "הפעל כשתפוסה נמוכה קרוב לתאריך - מבצע לאסט מיניט"
      case "high_demand_low_inventory":
        return "הפעל כשביקוש גבוה ומלאי נמוך - העלאת מחיר"
      default:
        return ""
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Rule Name / שם החוק</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Match Competitor Prices"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hotel">Hotel / מלון</Label>
        <Select value={formData.hotel_id} onValueChange={(value) => setFormData({ ...formData, hotel_id: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a hotel" />
          </SelectTrigger>
          <SelectContent>
            {hotels.map((hotel) => (
              <SelectItem key={hotel.id} value={hotel.id}>
                {hotel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-cyan-500/20 bg-cyan-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Trigger Condition / תנאי הפעלה</CardTitle>
          <CardDescription>מתי החוק יפעל?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="trigger_type">Trigger Type / סוג טריגר</Label>
            <Select
              value={formData.trigger_type}
              onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competitor_undercut">Competitor Undercuts / מתחרה מוריד מחיר</SelectItem>
                <SelectItem value="occupancy_threshold">Occupancy Threshold / סף תפוסה</SelectItem>
                <SelectItem value="demand_spike">Demand Spike / קפיצת ביקוש</SelectItem>
                <SelectItem value="date_range">Date Range / טווח תאריכים</SelectItem>
                <SelectItem value="booking_pace_below_budget">
                  Booking Pace Below Budget / קצב הזמנות מתחת לתקציב
                </SelectItem>
                <SelectItem value="booking_pace_above_budget">
                  Booking Pace Above Budget / קצב הזמנות מעל לתקציב
                </SelectItem>
                <SelectItem value="low_occupancy_near_date">
                  Low Occupancy Near Date / תפוסה נמוכה קרוב לתאריך
                </SelectItem>
                <SelectItem value="high_demand_low_inventory">
                  High Demand Low Inventory / ביקוש גבוה מלאי נמוך
                </SelectItem>
              </SelectContent>
            </Select>
            {formData.trigger_type && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <InfoIcon className="h-3 w-3" />
                {getTriggerDescription(formData.trigger_type)}
              </p>
            )}
          </div>

          {(formData.trigger_type === "booking_pace_below_budget" ||
            formData.trigger_type === "booking_pace_above_budget") && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <div className="space-y-2">
                <Label htmlFor="budget_variance_threshold">Budget Variance % / סטייה מתקציב</Label>
                <Input
                  id="budget_variance_threshold"
                  type="number"
                  value={formData.budget_variance_threshold}
                  onChange={(e) => setFormData({ ...formData, budget_variance_threshold: e.target.value })}
                  placeholder="e.g., 10 (for 10%)"
                />
                <p className="text-xs text-muted-foreground">כמה אחוז סטייה מהתקציב תפעיל את החוק</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking_pace_threshold">Booking Pace Days / ימים לבדיקת קצב</Label>
                <Input
                  id="booking_pace_threshold"
                  type="number"
                  value={formData.booking_pace_threshold}
                  onChange={(e) => setFormData({ ...formData, booking_pace_threshold: e.target.value })}
                  placeholder="e.g., 7 (last 7 days)"
                />
                <p className="text-xs text-muted-foreground">כמה ימים אחורה לבדוק קצב הזמנות</p>
              </div>
            </div>
          )}

          {formData.trigger_type === "low_occupancy_near_date" && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <div className="space-y-2">
                <Label htmlFor="days_ahead_threshold">Days Ahead / ימים קדימה</Label>
                <Input
                  id="days_ahead_threshold"
                  type="number"
                  value={formData.days_ahead_threshold}
                  onChange={(e) => setFormData({ ...formData, days_ahead_threshold: e.target.value })}
                  placeholder="e.g., 3 (3 days ahead)"
                />
                <p className="text-xs text-muted-foreground">כמה ימים קדימה לבדוק תפוסה נמוכה</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_occupancy">Min Occupancy % / תפוסה מינימלית</Label>
                <Input
                  id="target_occupancy"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.target_occupancy}
                  onChange={(e) => setFormData({ ...formData, target_occupancy: e.target.value })}
                  placeholder="e.g., 50"
                />
                <p className="text-xs text-muted-foreground">אם תפוסה מתחת לזה - הפעל</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Action / פעולה</CardTitle>
          <CardDescription>מה לעשות כשהתנאי מתקיים?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action_type">Action Type / סוג פעולה</Label>
            <Select
              value={formData.action_type}
              onValueChange={(value) => setFormData({ ...formData, action_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adjust_price">Adjust Price / התאם מחיר</SelectItem>
                <SelectItem value="match_competitor">Match Competitor / התאם למתחרה</SelectItem>
                <SelectItem value="send_alert">Send Alert Only / שלח התראה בלבד</SelectItem>
                <SelectItem value="increase_price">Increase Price / העלה מחיר</SelectItem>
                <SelectItem value="decrease_price">Decrease Price / הורד מחיר</SelectItem>
                <SelectItem value="set_minimum">Set Minimum Price / קבע מחיר מינימום</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Price Limits / גבולות מחיר</CardTitle>
          <CardDescription>מגבלות על שינויי מחיר</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_price">Minimum Price (₪) / מחיר מינימום</Label>
              <Input
                id="min_price"
                type="number"
                value={formData.min_price}
                onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                placeholder="No minimum"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_price">Maximum Price (₪) / מחיר מקסימום</Label>
              <Input
                id="max_price"
                type="number"
                value={formData.max_price}
                onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
                placeholder="No maximum"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Budget Targets / יעדי תקציב</CardTitle>
          <CardDescription>יעדים להשוואה</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_revenue">Target Revenue (₪) / יעד הכנסות</Label>
              <Input
                id="target_revenue"
                type="number"
                value={formData.target_revenue}
                onChange={(e) => setFormData({ ...formData, target_revenue: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_occupancy">Target Occupancy (%) / יעד תפוסה</Label>
              <Input
                id="target_occupancy"
                type="number"
                min="0"
                max="100"
                value={formData.target_occupancy}
                onChange={(e) => setFormData({ ...formData, target_occupancy: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max_daily_changes">Max Daily Changes / מקסימום שינויים ביום</Label>
          <Input
            id="max_daily_changes"
            type="number"
            min="1"
            max="10"
            value={formData.max_daily_changes}
            onChange={(e) => setFormData({ ...formData, max_daily_changes: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority / עדיפות (1 = highest)</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="10"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label htmlFor="is_active">Activate rule immediately / הפעל חוק מיידית</Label>
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Create Rule / צור חוק
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel / ביטול
        </Button>
      </div>
    </form>
  )
}
