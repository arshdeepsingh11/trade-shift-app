-- =========================================
-- RLS Policies — run after schema.sql
-- =========================================

-- Helper: get current user's role
create or replace function auth_role() returns user_role as $$
  select role from users where id = auth.uid();
$$ language sql stable security definer;

-- Helper: get current user's employer_id (if employer)
create or replace function auth_employer_id() returns uuid as $$
  select id from employers where user_id = auth.uid();
$$ language sql stable security definer;

-- Helper: get current user's employee record (if employee)
create or replace function auth_employee_id() returns uuid as $$
  select id from employees where user_id = auth.uid();
$$ language sql stable security definer;

-- ---------- USERS ----------
create policy "users_select_own_or_admin" on users
  for select using (
    id = auth.uid() or auth_role() = 'super_admin'
  );

create policy "users_insert_own" on users
  for insert with check (id = auth.uid());

create policy "users_update_own_or_admin" on users
  for update using (id = auth.uid() or auth_role() = 'super_admin');

-- ---------- EMPLOYERS ----------
create policy "employers_select" on employers
  for select using (
    user_id = auth.uid()
    or auth_role() = 'super_admin'
    or id in (select employer_id from employees where user_id = auth.uid())
  );

create policy "employers_insert_own" on employers
  for insert with check (user_id = auth.uid());

-- Only super_admin can update locked policy fields; employer can update other fields
-- (enforced at app level for locked fields + this policy for row ownership)
create policy "employers_update" on employers
  for update using (
    user_id = auth.uid() or auth_role() = 'super_admin'
  );

-- ---------- EMPLOYEES ----------
create policy "employees_select" on employees
  for select using (
    user_id = auth.uid()
    or auth_role() = 'super_admin'
    or employer_id = auth_employer_id()
  );

create policy "employees_insert_by_employer" on employees
  for insert with check (
    employer_id = auth_employer_id() or auth_role() = 'super_admin'
  );

create policy "employees_update" on employees
  for update using (
    employer_id = auth_employer_id() or auth_role() = 'super_admin'
  );

-- ---------- SITES ----------
create policy "sites_select" on sites
  for select using (
    employer_id = auth_employer_id()
    or auth_role() = 'super_admin'
    or employer_id in (select employer_id from employees where user_id = auth.uid())
  );

create policy "sites_insert" on sites
  for insert with check (
    employer_id = auth_employer_id() or auth_role() = 'super_admin'
  );

create policy "sites_update" on sites
  for update using (
    employer_id = auth_employer_id() or auth_role() = 'super_admin'
  );

-- ---------- SHIFTS ----------
create policy "shifts_select" on shifts
  for select using (
    auth_role() = 'super_admin'
    or employee_id = auth_employee_id()
    or site_id in (select id from sites where employer_id = auth_employer_id())
  );

create policy "shifts_insert" on shifts
  for insert with check (
    auth_role() = 'super_admin'
    or site_id in (select id from sites where employer_id = auth_employer_id())
  );

-- Employees can update their own shift (clock in/out); employers can update
-- shifts for their sites (e.g. accept late shift)
create policy "shifts_update" on shifts
  for update using (
    auth_role() = 'super_admin'
    or employee_id = auth_employee_id()
    or site_id in (select id from sites where employer_id = auth_employer_id())
  );

-- ---------- PAY PERIODS ----------
create policy "pay_periods_select" on pay_periods
  for select using (
    auth_role() = 'super_admin'
    or employer_id = auth_employer_id()
    or employer_id in (select employer_id from employees where user_id = auth.uid())
  );

create policy "pay_periods_insert" on pay_periods
  for insert with check (
    auth_role() = 'super_admin' or employer_id = auth_employer_id()
  );

create policy "pay_periods_update" on pay_periods
  for update using (
    auth_role() = 'super_admin' or employer_id = auth_employer_id()
  );

-- ---------- PAY SUMMARY ITEMS ----------
create policy "pay_summary_items_select" on pay_summary_items
  for select using (
    auth_role() = 'super_admin'
    or employee_id = auth_employee_id()
    or pay_period_id in (select id from pay_periods where employer_id = auth_employer_id())
  );

create policy "pay_summary_items_insert" on pay_summary_items
  for insert with check (
    auth_role() = 'super_admin'
    or pay_period_id in (select id from pay_periods where employer_id = auth_employer_id())
  );

create policy "pay_summary_items_update" on pay_summary_items
  for update using (
    auth_role() = 'super_admin'
    or pay_period_id in (select id from pay_periods where employer_id = auth_employer_id())
  );

-- ---------- NOTIFICATIONS ----------
create policy "notifications_select" on notifications
  for select using (
    auth_role() = 'super_admin' or employer_id = auth_employer_id()
  );

create policy "notifications_insert" on notifications
  for insert with check (true); -- system/backend inserts these

create policy "notifications_update" on notifications
  for update using (
    auth_role() = 'super_admin' or employer_id = auth_employer_id()
  );

-- ---------- AUDIT LOG ----------
-- Only super_admin can read; inserts happen via backend/service role
create policy "audit_log_select_admin_only" on audit_log
  for select using (auth_role() = 'super_admin');

create policy "audit_log_insert" on audit_log
  for insert with check (auth_role() = 'super_admin');
