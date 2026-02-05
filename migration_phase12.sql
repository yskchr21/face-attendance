-- ================================================
-- PHASE 12: ADVANCED EMPLOYEE & KIOSK SETTINGS
-- Run this SQL in Supabase SQL Editor
-- ================================================

-- 1. Add new columns to employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS ktp_url TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS job_position TEXT;

-- 2. Update attendance_logs constraint (add break_in/break_out)
ALTER TABLE attendance_logs 
DROP CONSTRAINT IF EXISTS attendance_logs_log_type_check;

ALTER TABLE attendance_logs 
ADD CONSTRAINT attendance_logs_log_type_check 
CHECK (log_type IN ('check_in', 'check_out', 'break_in', 'break_out'));

-- 3. Update status constraint
ALTER TABLE attendance_logs 
DROP CONSTRAINT IF EXISTS attendance_logs_status_check;

ALTER TABLE attendance_logs 
ADD CONSTRAINT attendance_logs_status_check 
CHECK (status IN ('ontime', 'late', 'on_time', 'early_departure', 'overtime', 'break'));

-- 4. Add new app_settings keys
INSERT INTO app_settings (key, value) VALUES 
('work_start_time', '07:00'),
('work_end_time', '15:00'),
('break_start_time', '11:00'),
('break_end_time', '12:00'),
('allow_late_checkin', 'true'),
('max_late_minutes', '60'),
('allow_early_checkout', 'false'),
('allow_early_breakout', 'true')
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- END OF MIGRATION
-- ================================================
