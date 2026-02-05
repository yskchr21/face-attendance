-- ================================================
-- PHASE 13: FINANCE & RBAC MIGRATION
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- 1. Update app_users constraint to allow 'superadmin'
ALTER TABLE app_users 
DROP CONSTRAINT IF EXISTS app_users_role_check;

ALTER TABLE app_users 
ADD CONSTRAINT app_users_role_check 
CHECK (role IN ('superadmin', 'admin', 'kiosk'));

-- 2. Seed Superadmin User (Password: super123)
-- NOTE: In production, passwords should be hashed. This is for prototype simplicity.
INSERT INTO app_users (username, password, role) 
VALUES ('superadmin', 'super123', 'superadmin')
ON CONFLICT (username) DO NOTHING;

-- 3. Add overtime_hourly_rate to employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS overtime_hourly_rate NUMERIC DEFAULT 0;

-- ================================================
-- END OF MIGRATION
-- ================================================
