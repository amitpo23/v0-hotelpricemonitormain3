"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"

interface Hotel {
  id: string
  name: string
  base_price: number | null
}

export function GeneratePredictionsButton({ hotels }: { hotels: Hotel[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/predictions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotels }),
      })

      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleGenerate} disabled={loading || hotels.length === 0} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Generate Predictions
    </Button>
  )
}
