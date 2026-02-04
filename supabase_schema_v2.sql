-- 1. Create a table for app users (Admin/Kiosk)
create table app_users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password text not null, -- In production, use hashing! keeping simple for prototype as requested
  role text check (role in ('admin', 'kiosk')) not null
);

-- Seed initial users
insert into app_users (username, password, role) values
('admin', 'admin123', 'admin'),
('kiosk', 'kiosk123', 'kiosk');

-- 2. Create the employees table (upgraded profiles)
create table employees (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  face_descriptor float8[] not null,
  work_start_time time default '09:00:00' -- Default start time
);

-- 3. Create attendance logs
create table attendance_logs (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null,
  status text check (status in ('ontime', 'late'))
);

-- 4. Clean up old table
drop table if exists profiles;
