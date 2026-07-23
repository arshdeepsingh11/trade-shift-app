-- =========================================
-- Employee Invites — run after rls_policies.sql
-- =========================================

create table employee_invites (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references employers(id) on delete cascade,
  email text not null,
  pay_rate numeric(10,2) not null,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  used boolean not null default false,
  created_at timestamptz not null default now()
);

alter table employee_invites enable row level security;

create policy "employee_invites_select" on employee_invites
  for select using (
    employer_id = auth_employer_id() or auth_role() = 'super_admin'
  );

create policy "employee_invites_insert" on employee_invites
  for insert with check (
    employer_id = auth_employer_id() or auth_role() = 'super_admin'
  );

-- Employees redeeming their own invite (after signup, matched by email) can update it
create policy "employee_invites_update_on_redeem" on employee_invites
  for update using (
    employer_id = auth_employer_id()
    or auth_role() = 'super_admin'
    or (used = false and email = (select email from users where id = auth.uid()))
  );

-- Safe lookup for the signup form (runs before the user is authenticated).
-- Returns only the fields needed to prefill signup — never exposes other invites.
create or replace function get_invite_by_code(code text)
returns table (employer_id uuid, email text, pay_rate numeric, used boolean, company_name text)
security definer
language sql
as $$
  select ei.employer_id, ei.email, ei.pay_rate, ei.used, e.company_name
  from employee_invites ei
  join employers e on e.id = ei.employer_id
  where ei.invite_code = code;
$$;
