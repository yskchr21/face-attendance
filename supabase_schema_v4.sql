-- 1. Wage columns for employees
alter table employees 
add column wage_type text check (wage_type in ('monthly', 'daily')) default 'monthly',
add column base_wage numeric default 0;

-- 2. Finance columns for logs
alter table attendance_logs 
add column fine_amount numeric default 0,
add column bonus_amount numeric default 0,
add column admin_notes text;
