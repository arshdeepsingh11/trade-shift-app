import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useEmployer } from '../../hooks/useEmployer';

interface EmployeeRow {
  id: string;
  pay_rate: number;
  users: { full_name: string; email: string } | null;
}

interface InviteRow {
  id: string;
  email: string;
  pay_rate: number;
  invite_code: string;
  used: boolean;
}

export default function Employees() {
  const { employer, loading: employerLoading } = useEmployer();

  const [email, setEmail] = useState('');
  const [payRate, setPayRate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastInviteCode, setLastInviteCode] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  async function loadData(employerId: string) {
    setListLoading(true);

    const { data: employeeData } = await supabase
      .from('employees')
      .select('id, pay_rate, users(full_name, email)')
      .eq('employer_id', employerId);

    const { data: inviteData } = await supabase
      .from('employee_invites')
      .select('id, email, pay_rate, invite_code, used')
      .eq('employer_id', employerId)
      .eq('used', false);

    setEmployees((employeeData as unknown as EmployeeRow[]) ?? []);
    setInvites((inviteData as InviteRow[]) ?? []);
    setListLoading(false);
  }

  useEffect(() => {
    if (employer) {
      loadData(employer.id);
    }
  }, [employer]);

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!employer) {
      setError('Could not find your employer account.');
      return;
    }

    const rate = parseFloat(payRate);
    if (isNaN(rate) || rate <= 0) {
      setError('Please enter a valid pay rate.');
      return;
    }

    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from('employee_invites')
      .insert({ employer_id: employer.id, email, pay_rate: rate })
      .select('invite_code')
      .single();

    setSubmitting(false);

    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not create invite.');
      return;
    }

    setLastInviteCode(data.invite_code);
    setEmail('');
    setPayRate('');
    loadData(employer.id);
  }

  if (employerLoading) return null;

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Employees</h1>
        <p className="dashboard-subtitle">Invite and manage your team.</p>
      </div>

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#33344a' }}>Invite an employee</h3>
        <form onSubmit={handleInvite}>
          <div className="dashboard-field">
            <label>Employee email</label>
            <input
              type="email"
              placeholder="employee@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="dashboard-field">
            <label>Pay rate (per hour)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="25.00"
              value={payRate}
              onChange={(e) => setPayRate(e.target.value)}
              required
            />
          </div>

          {error && <div className="dashboard-error">{error}</div>}

          <button className="dashboard-button" type="submit" disabled={submitting}>
            {submitting ? 'Creating invite...' : 'Generate invite code'}
          </button>
        </form>

        {lastInviteCode && (
          <div className="invite-code-box">
            Invite code — share this with your employee:
            <div className="invite-code-value">{lastInviteCode}</div>
          </div>
        )}
      </div>

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#33344a' }}>Your team</h3>
        {listLoading ? (
          <div className="dashboard-empty">Loading...</div>
        ) : employees.length === 0 && invites.length === 0 ? (
          <div className="dashboard-empty">No employees yet — invite your first one above.</div>
        ) : (
          <>
            {employees.map((emp) => (
              <div className="list-row" key={emp.id}>
                <div>
                  <div className="list-row-title">{emp.users?.full_name ?? 'Unknown'}</div>
                  <div className="list-row-subtitle">
                    {emp.users?.email} — ${emp.pay_rate}/hr
                  </div>
                </div>
                <span className="status-pill active">Active</span>
              </div>
            ))}

            {invites.map((inv) => (
              <div className="list-row" key={inv.id}>
                <div>
                  <div className="list-row-title">{inv.email}</div>
                  <div className="list-row-subtitle">
                    ${inv.pay_rate}/hr — code: {inv.invite_code}
                  </div>
                </div>
                <span className="status-pill pending">Pending</span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}