-- SQL Fix V2: Add 'early_departure' and 'overtime'
-- Drop previous constraint
alter table attendance_logs 
drop constraint if exists attendance_logs_status_check;

-- Add new comprehensive constraint
alter table attendance_logs 
add constraint attendance_logs_status_check 
check (status in ('ontime', 'late', 'present', 'on_time', 'early_departure', 'overtime'));
