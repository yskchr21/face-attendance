-- ================================================
-- FACE ATTENDANCE APP - PRODUCTION DATABASE SCHEMA
-- ================================================
-- Run this SQL in Supabase SQL Editor to set up the database.
-- This is a consolidated schema from all development migrations.

-- ================================================
-- 1. APP USERS (Admin/Kiosk Authentication)
-- ================================================
create table if not exists app_users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password text not null,
  role text check (role in ('admin', 'kiosk')) not null
);

-- Seed initial users (Change passwords in production!)
insert into app_users (username, password, role) values
('admin', 'admin123', 'admin'),
('kiosk', 'kiosk123', 'kiosk')
on conflict (username) do nothing;

-- ================================================
-- 2. EMPLOYEES
-- ================================================
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  face_descriptor float8[] not null,
  work_start_time time default '09:00:00',
  work_end_time time default '18:00:00',
  wage_type text check (wage_type in ('monthly', 'daily')) default 'monthly',
  base_wage numeric default 0,
  whatsapp_number text
);

-- ================================================
-- 3. ATTENDANCE LOGS
-- ================================================
create table if not exists attendance_logs (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  log_type text check (log_type in ('check_in', 'check_out')) default 'check_in',
  status text check (status in ('ontime', 'late', 'on_time', 'early_departure', 'overtime')),
  fine_amount numeric default 0,
  bonus_amount numeric default 0,
  admin_notes text
);

-- ================================================
-- 4. APP SETTINGS
-- ================================================
create table if not exists app_settings (
  key text primary key,
  value text
);

-- Seed default settings
insert into app_settings (key, value) values 
('timezone', 'Asia/Jakarta'),
('company_name', 'My Company'),
('late_threshold', '15'),
('language', 'en')
on conflict (key) do nothing;

-- ================================================
-- END OF SCHEMA
-- ================================================
