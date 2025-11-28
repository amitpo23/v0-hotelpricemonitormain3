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
        return { data: { user }, error: null }
      } catch (error) {
        return { data: { user: null }, error }
      }
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            apikey: this.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        })
        const data = await response.json()
        if (data.access_token && typeof window !== "undefined") {
          localStorage.setItem("supabase-auth-token", data.access_token)
        }
        return { data: { user: data.user, session: data }, error: data.error ? data : null }
      } catch (error) {
        return { data: null, error }
      }
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      try {
        const response = await fetch(`${this.url}/auth/v1/signup`, {
          method: "POST",
          headers: {
            apikey: this.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, ...options }),
        })
        const data = await response.json()
        return { data: { user: data.user, session: data }, error: data.error ? data : null }
      } catch (error) {
        return { data: null, error }
      }
    },
    signOut: async () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("supabase-auth-token")
      }
      return { error: null }
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Simplified auth state change listener
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
