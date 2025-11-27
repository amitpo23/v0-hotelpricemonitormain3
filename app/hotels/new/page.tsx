"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeftIcon } from "@/components/icons"
import Link from "next/link"

export default function NewHotelPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const competitorUrls = formData.get("competitor_urls") as string

    try {
      const response = await fetch("/api/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          location: formData.get("location"),
          base_price: Number.parseFloat(formData.get("base_price") as string) || null,
          competitor_urls: competitorUrls ? competitorUrls.split("\n").filter(Boolean) : [],
        }),
      })

      if (!response.ok) throw new Error("Failed to create hotel")

      router.push("/hotels")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/hotels">
        <Button variant="ghost" className="mb-6">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Hotels
        </Button>
      </Link>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add New Hotel</CardTitle>
          <CardDescription>Enter details for your hotel property</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Hotel Name *</Label>
              <Input id="name" name="name" placeholder="Grand Plaza Hotel" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="New York, NY" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price ($)</Label>
              <Input id="base_price" name="base_price" type="number" step="0.01" placeholder="150.00" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="competitor_urls">Competitor URLs (one per line)</Label>
              <Textarea
                id="competitor_urls"
                name="competitor_urls"
                placeholder="https://booking.com/hotel/grand-plaza&#10;https://expedia.com/grand-plaza"
                rows={4}
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 rounded-md">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Create Hotel"}
              </Button>
              <Link href="/hotels">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
