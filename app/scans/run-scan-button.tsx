"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface RunScanButtonProps {
  configId: string
  hotelName?: string
}

export function RunScanButton({ configId, hotelName }: RunScanButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleRunScan = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/scans/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config_id: configId }),
      })

      const data = await response.json()

      if (response.ok) {
        alert(
          `Scan completed!\n\nResults:\n- Min Price: $${data.summary.min_price.toFixed(2)}\n- Max Price: $${data.summary.max_price.toFixed(2)}\n- Avg Price: $${data.summary.avg_price.toFixed(2)}\n- Recommended: $${data.summary.recommended_price.toFixed(2)}`,
        )
        router.refresh()
      } else {
        alert(`Scan failed: ${data.error}`)
      }
    } catch (error) {
      alert("Failed to execute scan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRunScan}
      disabled={loading}
      className="text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/10"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
    </Button>
  )
}
