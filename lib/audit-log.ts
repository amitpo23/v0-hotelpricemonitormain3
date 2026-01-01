/**
 * Audit Log System
 * Tracks all admin actions for security and compliance
 */

interface AuditLogEntry {
  admin_user_id: string
  action_type: "user_approved" | "user_deleted" | "user_role_changed" | "settings_changed" | "hotel_added" | "hotel_deleted"
  target_user_id?: string
  target_resource_id?: string
  details?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

/**
 * Creates an audit log entry
 * Note: Requires audit_logs table in Supabase
 *
 * Table Schema (SQL):
 *
 * CREATE TABLE audit_logs (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   admin_user_id UUID NOT NULL REFERENCES profiles(id),
 *   action_type TEXT NOT NULL,
 *   target_user_id UUID REFERENCES profiles(id),
 *   target_resource_id TEXT,
 *   details JSONB,
 *   ip_address TEXT,
 *   user_agent TEXT,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_user_id);
 * CREATE INDEX idx_audit_logs_target ON audit_logs(target_user_id);
 * CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
 */
export async function createAuditLog(
  supabase: any,
  entry: AuditLogEntry
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from("audit_logs").insert({
      admin_user_id: entry.admin_user_id,
      action_type: entry.action_type,
      target_user_id: entry.target_user_id || null,
      target_resource_id: entry.target_resource_id || null,
      details: entry.details || null,
      ip_address: entry.ip_address || null,
      user_agent: entry.user_agent || null,
    })

    if (error) {
      console.error("[v0] Audit log error:", error.message)
      // Don't fail the main operation if audit log fails
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("[v0] Audit log exception:", error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Gets client IP from request headers
 */
export function getClientIP(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0] ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    undefined
  )
}

/**
 * Gets user agent from request headers
 */
export function getUserAgent(headers: Headers): string | undefined {
  return headers.get("user-agent") || undefined
}
