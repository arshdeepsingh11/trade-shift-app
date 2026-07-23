-- =========================================
-- Trades Shift & Payroll App — Initial Schema
-- =========================================

-- Roles: employer, employee, super_admin
create type user_role as enum ('employer', 'employee', 'super_admin');
create type pay_frequency as enum ('weekly', 'biweekly', 'monthly');
create type pay_method as enum ('direct_deposit', 'cheque');
create type shift_status as enum (
  'scheduled',        -- created, not yet started
  'active',            -- employee clocked in on time
  'awaiting_approval', -- 10 min passed, no clock-in, waiting on employer
  'employer_accepted',-- employer accepted late start, clock now running
  'completed'          -- employee clocked out
);

-- ---------- USERS ----------
-- Extends Supabase auth.users with role + profile info
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- EMPLOYERS ----------
create table employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  company_name text not null,
  pay_frequency pay_frequency not null,   -- locked after first set
  pay_method pay_method not null,          -- locked after first set
  policy_locked boolean not null default true, -- only super_admin can flip this to edit
  created_at timestamptz not null default now()
);

-- ---------- EMPLOYEES ----------
create table employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  employer_id uuid not null references employers(id) on delete cascade,
  pay_rate numeric(10,2) not null,
  created_at timestamptz not null default now()
);

-- ---------- SITES ----------
-- e.g. "Cochrane" for a 2-month contract
create table sites (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

-- ---------- SHIFTS ----------
create table shifts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status shift_status not null default 'scheduled',

  actual_start timestamptz,   -- when hours actually start counting
  actual_end timestamptz,

  start_lat double precision,
  start_lng double precision,
  end_lat double precision,
  end_lng double precision,

  accepted_by_employer_at timestamptz, -- set when employer accepts a late shift
  accepted_by_user_id uuid references users(id),

  created_at timestamptz not null default now()
);

-- ---------- PAY PERIODS ----------
create table pay_periods (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  pay_date date not null,
  status text not null default 'pending', -- pending -> summary_sent -> paid
  created_at timestamptz not null default now()
);

-- ---------- PAY SUMMARY LINE ITEMS ----------
-- one row per employee per pay period
create table pay_summary_items (
  id uuid primary key default gen_random_uuid(),
  pay_period_id uuid not null references pay_periods(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  hours_worked numeric(10,2) not null default 0,
  pay_rate numeric(10,2) not null,
  total_pay numeric(10,2) generated always as (hours_worked * pay_rate) stored,
  edited boolean not null default false, -- employer manually adjusted
  created_at timestamptz not null default now()
);

-- ---------- NOTIFICATIONS ----------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  shift_id uuid references shifts(id) on delete cascade,
  type text not null, -- 'shift_started' | 'shift_missed' | 'pay_summary_ready'
  message text,
  sent_at timestamptz not null default now(),
  read boolean not null default false
);

-- ---------- AUDIT LOG ----------
-- Tracks super_admin overrides (e.g. changing a locked pay policy)
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references users(id),
  action text not null,       -- e.g. 'updated_pay_frequency'
  target_table text not null, -- e.g. 'employers'
  target_id uuid not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- =========================================
-- Row Level Security (enable, policies added next iteration)
-- =========================================
alter table users enable row level security;
alter table employers enable row level security;
alter table employees enable row level security;
alter table sites enable row level security;
alter table shifts enable row level security;
alter table pay_periods enable row level security;
alter table pay_summary_items enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;
