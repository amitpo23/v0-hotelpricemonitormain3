import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I"

export function createClient() {
  if (client) return client

  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  return client
}
