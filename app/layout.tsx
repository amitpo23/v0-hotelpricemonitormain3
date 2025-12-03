import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ClientLayout } from "./ClientLayout"

export const metadata: Metadata = {
  title: "Cockpit | Hotel Revenue Command Center",
  description:
    "Your hotel revenue command center. Navigate pricing, monitor competitors, and let Autopilot optimize your rates automatically.",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-slate-950 text-white">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
