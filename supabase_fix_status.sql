-- SQL Fix: Update allowed status values
-- We need to drop the old check constraint and add a new one

-- 1. Drop the constraint (Supabase usually names check constraints as table_column_check)
alter table attendance_logs 
drop constraint if exists attendance_logs_status_check;

-- 2. Add new constraint allowing 'present'
alter table attendance_logs 
add constraint attendance_logs_status_check 
check (status in ('ontime', 'late', 'present', 'on_time'));
