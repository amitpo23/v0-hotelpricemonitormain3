"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

export function MarkAlertReadButton({ alertId }: { alertId: string }) {
  const router = useRouter()

  async function handleMarkRead() {
    await fetch(`/api/alerts/${alertId}/read`, { method: "POST" })
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleMarkRead}>
      <Check className="h-4 w-4 mr-1" />
      Mark read
    </Button>
  )
}
