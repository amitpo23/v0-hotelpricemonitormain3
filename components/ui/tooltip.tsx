"use client"

import * as React from "react"

// Tooltip Provider - wraps the tooltip context
const TooltipProvider = React.memo(({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
})
TooltipProvider.displayName = "TooltipProvider"

// Tooltip - main container component
const Tooltip = React.memo(({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
})
Tooltip.displayName = "Tooltip"

// Tooltip Trigger - the element that triggers the tooltip
const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  return asChild ? <>{children}</> : <button ref={ref} {...props}>{children}</button>
})
TooltipTrigger.displayName = "TooltipTrigger"

// Tooltip Content - the actual tooltip content
const TooltipContent = React.memo(({ children }: { children: React.ReactNode }) => {
  return null
})
TooltipContent.displayName = "TooltipContent"

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
