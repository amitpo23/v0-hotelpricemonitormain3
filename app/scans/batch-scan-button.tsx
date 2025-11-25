"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function BatchScanButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleBatchScan = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/scans/batch", {
        method: "POST",
      })

      const data = await response.json()

      if (response.ok) {
        alert(
          `Batch scan completed!\n\n${data.scans_executed} scans executed\n${data.successful} successful\n${data.failed} failed`,
        )
        router.refresh()
      } else {
        alert(`Batch scan failed: ${data.error}`)
      }
    } catch (error) {
      alert("Failed to execute batch scan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleBatchScan}
      disabled={loading}
      className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 bg-transparent"
    >
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
      Scan All
    </Button>
  )
}
