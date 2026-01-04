/*
 * @copilot FIX THIS FILE
 * 
 * ERROR in Vercel build:
 * ReferenceError: TooltipProvider is not defined
 * at .next/server/app/predictions/page.js
 * 
 * PROBLEM:
 * Current implementation uses function declarations but they're not
 * being properly exported for use in Server-Side Rendering (SSR).
 * 
 * SOLUTION:
 * Need to create proper React component exports that work in both
 * client and server contexts. Consider using React.memo or ensuring
 * proper hoisting of function declarations.
 * 
 * REQUIREMENTS:
 * - Components must work with 'use client' directive
 * - Must export: TooltipProvider, Tooltip, TooltipTrigger, TooltipContent
 * - Must be compatible with Next.js SSR
 */


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