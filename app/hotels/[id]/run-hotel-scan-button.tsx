"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Scan, Loader2, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface RunHotelScanButtonProps {
  hotelId: string
}

export function RunHotelScanButton({ hotelId }: RunHotelScanButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const router = useRouter()

  const handleScan = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/scans/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotel_id: hotelId }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data.summary)
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
    <div className="space-y-4">
      <Button
        onClick={handleScan}
        disabled={loading}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Scanning Competitors...
          </>
        ) : (
          <>
            <Scan className="h-4 w-4 mr-2" />
            Run Price Scan Now
          </>
        )}
      </Button>

      {result && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-green-400 mb-3">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Scan Complete</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Market Low:</span>
              <span className="ml-2 font-mono text-cyan-400">${result.min_price.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Market High:</span>
              <span className="ml-2 font-mono text-cyan-400">${result.max_price.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Average:</span>
              <span className="ml-2 font-mono text-cyan-400">${result.avg_price.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Your Price:</span>
              <span className="ml-2 font-mono text-purple-400">${Number(result.your_price).toFixed(2)}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-border">
              <span className="text-muted-foreground">AI Recommended:</span>
              <span className="ml-2 font-mono text-green-400 text-lg">${result.recommended_price.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
