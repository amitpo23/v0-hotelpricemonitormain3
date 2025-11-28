const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dqhmraeyisoigxzsitiz.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxaG1yYWV5aXNvaWd4enNpdGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNTcxODEsImV4cCI6MjA3OTYzMzE4MX0.gOmmQBEpT2GJw97dFmlVBX1CtGpfAhARX71K3NlIx8I"

class SupabaseClient {
  private url: string
  private key: string

  constructor(url: string, key: string) {
    this.url = url
    this.key = key
  }

  from(table: string) {
    return new QueryBuilder(this.url, this.key, table)
  }

  auth = {
    getUser: async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("supabase-auth-token") : null
      if (!token) return { data: { user: null }, error: null }

      try {
        const response = await fetch(`${this.url}/auth/v1/user`, {
          headers: {
            apikey: this.key,
            Authorization: `Bearer ${token}`,
          },
        })
        const user = await response.json()
        if (user.error || !user.id) {
          return { data: { user: null }, error: user.error || null }
        }
        return { data: { user }, error: null }
      } catch (error) {
        return { data: { user: null }, error }
      }
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        console.log("[v0] Attempting sign in for:", email)
        const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: this.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        })

        const data = await response.json()
        console.log("[v0] Sign in response status:", response.status)
        console.log("[v0] Sign in response data:", JSON.stringify(data).substring(0, 200))

        // Check for error in response
        if (!response.ok || data.error || data.error_description) {
          const errorMessage = data.error_description || data.error || data.msg || "Authentication failed"
          console.log("[v0] Sign in error:", errorMessage)
          return { data: { user: null, session: null }, error: { message: errorMessage } }
        }

        // Success - store token
        if (data.access_token && typeof window !== "undefined") {
          localStorage.setItem("supabase-auth-token", data.access_token)
          localStorage.setItem("supabase-refresh-token", data.refresh_token || "")
          console.log("[v0] Token stored successfully")
        }

        return { data: { user: data.user, session: data }, error: null }
      } catch (error: any) {
        console.log("[v0] Sign in exception:", error)
        return { data: { user: null, session: null }, error: { message: error.message || "Network error" } }
      }
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      try {
        console.log("[v0] Attempting sign up for:", email)
        const response = await fetch(`${this.url}/auth/v1/signup`, {
          method: "POST",
          headers: {
            apikey: this.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            email_confirm: true,
            data: options?.data || {},
          }),
        })

        const data = await response.json()
        console.log("[v0] Sign up response status:", response.status)

        if (!response.ok || data.error || data.error_description) {
          const errorMessage = data.error_description || data.error || data.msg || "Sign up failed"
          return { data: { user: null, session: null }, error: { message: errorMessage } }
        }

        return { data: { user: data.user || data, session: data }, error: null }
      } catch (error: any) {
        console.log("[v0] Sign up exception:", error)
        return { data: { user: null, session: null }, error: { message: error.message || "Network error" } }
      }
    },
    signOut: async () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("supabase-auth-token")
        localStorage.removeItem("supabase-refresh-token")
      }
      return { error: null }
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Check initial state
      if (typeof window !== "undefined") {
        const token = localStorage.getItem("supabase-auth-token")
        if (token) {
          callback("SIGNED_IN", { access_token: token })
        }
      }
      return { data: { subscription: { unsubscribe: () => {} } } }
    },
  }
}

class QueryBuilder {
  private url: string
  private key: string
  private table: string
  private selectQuery = "*"
  private filters: string[] = []
  private orderColumn = ""
  private orderAscending = true
  private limitCount: number | null = null
  private isSingle = false

  constructor(url: string, key: string, table: string) {
    this.url = url
    this.key = key
    this.table = table
  }

  select(columns = "*") {
    this.selectQuery = columns
    return this
  }

  eq(column: string, value: any) {
    this.filters.push(`${column}=eq.${value}`)
    return this
  }

  gte(column: string, value: any) {
    this.filters.push(`${column}=gte.${value}`)
    return this
  }

  lte(column: string, value: any) {
    this.filters.push(`${column}=lte.${value}`)
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column
    this.orderAscending = options?.ascending ?? true
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  async then<T>(resolve: (value: { data: T | null; error: any }) => void) {
    try {
      let endpoint = `${this.url}/rest/v1/${this.table}?select=${encodeURIComponent(this.selectQuery)}`

      if (this.filters.length > 0) {
        endpoint += "&" + this.filters.join("&")
      }

      if (this.orderColumn) {
        endpoint += `&order=${this.orderColumn}.${this.orderAscending ? "asc" : "desc"}`
      }

      if (this.limitCount) {
        endpoint += `&limit=${this.limitCount}`
      }

      const response = await fetch(endpoint, {
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      resolve({ data: this.isSingle ? data[0] || null : data, error: null })
    } catch (error) {
      resolve({ data: null, error })
    }
  }

  async insert(data: any) {
    try {
      const response = await fetch(`${this.url}/rest/v1/${this.table}`, {
        method: "POST",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async update(data: any) {
    try {
      let endpoint = `${this.url}/rest/v1/${this.table}`
      if (this.filters.length > 0) {
        endpoint += "?" + this.filters.join("&")
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async delete() {
    try {
      let endpoint = `${this.url}/rest/v1/${this.table}`
      if (this.filters.length > 0) {
        endpoint += "?" + this.filters.join("&")
      }

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
        },
      })
      return { data: null, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  async upsert(data: any) {
    try {
      const response = await fetch(`${this.url}/rest/v1/${this.table}`, {
        method: "POST",
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          "Content-Type": "application/json",
          Prefer: "return=representation,resolution=merge-duplicates",
        },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      return { data: result, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }
}

let client: SupabaseClient | null = null

export function createClient() {
  if (client) return client
  client = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}
