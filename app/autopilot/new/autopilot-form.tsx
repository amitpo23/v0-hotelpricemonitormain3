"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2Icon } from "@/components/icons"

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Match Competitor Prices"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hotel">Hotel</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trigger_type">Trigger Condition</Label>
          <Select
            value={formData.trigger_type}
            onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="competitor_undercut">Competitor Undercuts</SelectItem>
              <SelectItem value="occupancy_threshold">Occupancy Threshold</SelectItem>
              <SelectItem value="demand_spike">Demand Spike</SelectItem>
              <SelectItem value="date_range">Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="action_type">Action</Label>
          <Select
            value={formData.action_type}
            onValueChange={(value) => setFormData({ ...formData, action_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="adjust_price">Adjust Price</SelectItem>
              <SelectItem value="match_competitor">Match Competitor</SelectItem>
              <SelectItem value="send_alert">Send Alert Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="min_price">Minimum Price ($)</Label>
          <Input
            id="min_price"
            type="number"
            value={formData.min_price}
            onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
            placeholder="No minimum"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_price">Maximum Price ($)</Label>
          <Input
            id="max_price"
            type="number"
            value={formData.max_price}
            onChange={(e) => setFormData({ ...formData, max_price: e.target.value })}
            placeholder="No maximum"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target_revenue">Target Revenue ($)</Label>
          <Input
            id="target_revenue"
            type="number"
            value={formData.target_revenue}
            onChange={(e) => setFormData({ ...formData, target_revenue: e.target.value })}
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="target_occupancy">Target Occupancy (%)</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max_daily_changes">Max Daily Changes</Label>
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
          <Label htmlFor="priority">Priority (1 = highest)</Label>
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
        <Label htmlFor="is_active">Activate rule immediately</Label>
      </div>

      <div className="flex gap-4">
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Create Rule
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
