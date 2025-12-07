// Server-side Supabase client using fetch for v0 compatibility
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

type QueryResult<T> = {
  data: T | null
  error: { message: string } | null
}

class ServerQueryBuilder<T = any> {
  private tableName: string
  private selectColumns = "*"
  private filters: string[] = []
  private orderColumn: string | null = null
  private orderAscending = true
  private limitCount: number | null = null
  private singleResult = false

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(columns = "*") {
    this.selectColumns = columns
    return this
  }

  eq(column: string, value: any) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`)
    return this
  }

  neq(column: string, value: any) {
    this.filters.push(`${column}=neq.${encodeURIComponent(value)}`)
    return this
  }

  gt(column: string, value: any) {
    this.filters.push(`${column}=gt.${encodeURIComponent(value)}`)
    return this
  }

  gte(column: string, value: any) {
    this.filters.push(`${column}=gte.${encodeURIComponent(value)}`)
    return this
  }

  lt(column: string, value: any) {
    this.filters.push(`${column}=lt.${encodeURIComponent(value)}`)
    return this
  }

  lte(column: string, value: any) {
    this.filters.push(`${column}=lte.${encodeURIComponent(value)}`)
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push(`${column}=in.(${values.map((v) => encodeURIComponent(v)).join(",")})`)
    return this
  }

  is(column: string, value: any) {
    this.filters.push(`${column}=is.${value}`)
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
    this.singleResult = true
    this.limitCount = 1
    return this
  }

  maybeSingle() {
    this.singleResult = true
    this.limitCount = 1
    return this
  }

  async then<TResult>(onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>): Promise<TResult> {
    const result = await this.execute()
    return onfulfilled ? onfulfilled(result) : (result as any)
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      let url = `${SUPABASE_URL}/rest/v1/${this.tableName}?select=${encodeURIComponent(this.selectColumns)}`

      if (this.filters.length > 0) {
        url += "&" + this.filters.join("&")
      }

      if (this.orderColumn) {
        url += `&order=${this.orderColumn}.${this.orderAscending ? "asc" : "desc"}`
      }

      if (this.limitCount) {
        url += `&limit=${this.limitCount}`
      }

      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: { message: errorText } }
      }

      const data = await response.json()

      if (this.singleResult) {
        return { data: data[0] || null, error: null }
      }

      return { data, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  }
}

class ServerInsertBuilder<T = any> {
  private tableName: string
  private data: any
  private returnData = false

  constructor(tableName: string, data: any) {
    this.tableName = tableName
    this.data = data
  }

  select(columns = "*") {
    this.returnData = true
    return this
  }

  single() {
    this.returnData = true
    return this
  }

  async then<TResult>(onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>): Promise<TResult> {
    const result = await this.execute()
    return onfulfilled ? onfulfilled(result) : (result as any)
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${this.tableName}`

      const headers: Record<string, string> = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      }

      if (this.returnData) {
        headers["Prefer"] = "return=representation"
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(this.data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: { message: errorText } }
      }

      if (this.returnData) {
        const data = await response.json()
        return { data: Array.isArray(data) ? data[0] : data, error: null }
      }

      return { data: null, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  }
}

class ServerUpdateBuilder<T = any> {
  private tableName: string
  private data: any
  private filters: string[] = []
  private returnData = false

  constructor(tableName: string, data: any) {
    this.tableName = tableName
    this.data = data
  }

  eq(column: string, value: any) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`)
    return this
  }

  select(columns = "*") {
    this.returnData = true
    return this
  }

  single() {
    this.returnData = true
    return this
  }

  async then<TResult>(onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>): Promise<TResult> {
    const result = await this.execute()
    return onfulfilled ? onfulfilled(result) : (result as any)
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      let url = `${SUPABASE_URL}/rest/v1/${this.tableName}`

      if (this.filters.length > 0) {
        url += "?" + this.filters.join("&")
      }

      const headers: Record<string, string> = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      }

      if (this.returnData) {
        headers["Prefer"] = "return=representation"
      }

      const response = await fetch(url, {
        method: "PATCH",
        headers,
        body: JSON.stringify(this.data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: { message: errorText } }
      }

      if (this.returnData) {
        const data = await response.json()
        return { data: Array.isArray(data) ? data[0] : data, error: null }
      }

      return { data: null, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  }
}

class ServerDeleteBuilder<T = any> {
  private tableName: string
  private filters: string[] = []

  constructor(tableName: string) {
    this.tableName = tableName
  }

  eq(column: string, value: any) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`)
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push(`${column}=in.(${values.map((v) => encodeURIComponent(v)).join(",")})`)
    return this
  }

  async then<TResult>(onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>): Promise<TResult> {
    const result = await this.execute()
    return onfulfilled ? onfulfilled(result) : (result as any)
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      let url = `${SUPABASE_URL}/rest/v1/${this.tableName}`

      if (this.filters.length > 0) {
        url += "?" + this.filters.join("&")
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: { message: errorText } }
      }

      return { data: null, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  }
}

class ServerUpsertBuilder<T = any> {
  private tableName: string
  private data: any
  private returnData = false
  private conflictColumns: string | null = null

  constructor(tableName: string, data: any) {
    this.tableName = tableName
    this.data = data
  }

  onConflict(columns: string) {
    this.conflictColumns = columns
    return this
  }

  select(columns = "*") {
    this.returnData = true
    return this
  }

  single() {
    this.returnData = true
    return this
  }

  async then<TResult>(onfulfilled?: (value: QueryResult<T>) => TResult | PromiseLike<TResult>): Promise<TResult> {
    const result = await this.execute()
    return onfulfilled ? onfulfilled(result) : (result as any)
  }

  private async execute(): Promise<QueryResult<T>> {
    try {
      let url = `${SUPABASE_URL}/rest/v1/${this.tableName}`
      if (this.conflictColumns) {
        url += `?on_conflict=${this.conflictColumns}`
      }

      const headers: Record<string, string> = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates" + (this.returnData ? ",return=representation" : ""),
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(this.data),
      })

      if (!response.ok) {
        const errorText = await response.text()
        return { data: null, error: { message: errorText } }
      }

      if (this.returnData) {
        const data = await response.json()
        return { data: Array.isArray(data) ? data[0] : data, error: null }
      }

      return { data: null, error: null }
    } catch (err: any) {
      return { data: null, error: { message: err.message } }
    }
  }
}

class ServerTableBuilder {
  private tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(columns = "*") {
    const builder = new ServerQueryBuilder(this.tableName)
    return builder.select(columns)
  }

  insert(data: any) {
    return new ServerInsertBuilder(this.tableName, data)
  }

  update(data: any) {
    return new ServerUpdateBuilder(this.tableName, data)
  }

  delete() {
    return new ServerDeleteBuilder(this.tableName)
  }

  upsert(data: any) {
    return new ServerUpsertBuilder(this.tableName, data)
  }
}

const serverClient = {
  from(table: string) {
    return new ServerTableBuilder(table)
  },
}

export async function createClient() {
  return serverClient
}
