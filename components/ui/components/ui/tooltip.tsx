"use client"

import * as React from "react"

// Tooltip stub components for build compatibility
function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(function TooltipTrigger({ children, asChild, ...props }, ref) {
  return asChild ? <>{children}</> : <button ref={ref} {...props}>{children}</button>
})

function TooltipContent({ children }: { children: React.ReactNode }) {
  return null
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }