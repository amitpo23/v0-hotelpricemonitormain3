"use client"

import * as React from "react"

// Tooltip stub components for build compatibility
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

export const Tooltip = ({ children }: { children: React.ReactNode }) => <>{children}</>

export const TooltipTrigger = React.forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, asChild, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : "button"
  return asChild ? <>{children}</> : <button ref={ref} {...props}>{children}</button>
})
TooltipTrigger.displayName = "TooltipTrigger"

export const TooltipContent = ({ children }: { children: React.ReactNode }) => null
