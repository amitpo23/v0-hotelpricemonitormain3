-- Migration: Create audit_logs table for admin action tracking
-- Description: Tracks all admin actions for security and compliance
-- Created: 2025-12-07

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_approved',
    'user_deleted',
    'user_role_changed',
    'settings_changed',
    'hotel_added',
    'hotel_deleted'
  )),
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user ON audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Add Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (profiles.is_admin = true OR profiles.role = 'admin')
    )
  );

-- Policy: System can insert audit logs (service role)
CREATE POLICY "System can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Tracks all admin actions for security and compliance';
COMMENT ON COLUMN audit_logs.admin_user_id IS 'The admin user who performed the action';
COMMENT ON COLUMN audit_logs.action_type IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.target_user_id IS 'The user affected by the action (if applicable)';
COMMENT ON COLUMN audit_logs.target_resource_id IS 'ID of the resource affected (e.g., hotel_id)';
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the admin who performed the action';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent of the admin who performed the action';
