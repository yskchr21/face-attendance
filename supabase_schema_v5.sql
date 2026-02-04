-- 1. Add Schedule and PIN columns
alter table employees 
add column work_end_time time default '18:00:00',
add column pin text default '123456';
