-- 1. Add is_active to employees
alter table employees 
add column is_active boolean default true;

-- 2. Add log_type to attendance_logs
alter table attendance_logs 
add column log_type text check (log_type in ('check_in', 'check_out'));

-- 3. Optional: Backfill existing logs as 'check_in'
update attendance_logs set log_type = 'check_in' where log_type is null;
