-- 1. WhatsApp column
alter table employees 
add column whatsapp_number text;

-- 2. App Settings table
create table app_settings (
  key text primary key,
  value text
);

-- 3. Seed Settings
insert into app_settings (key, value) values 
('timezone', 'Asia/Jakarta'),
('company_name', 'My Company'),
('late_threshold', '15');
