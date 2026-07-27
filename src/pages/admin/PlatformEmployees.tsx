import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { sendPasswordResetLink } from '../../lib/passwordReset';

interface EmployeeRow {
  id: string;
  pay_rate: number;
  active: boolean;
  users: { full_name: string; email: string } | null;
  employers: { company_name: string } | null;
}

export default function PlatformEmployees() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, pay_rate, active, users(full_name, email), employers(company_name)')
      .then(({ data }) => {
        setEmployees((data as unknown as EmployeeRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  async function handleSendReset(email: string) {
    setResetMsg(null);
    const { error } = await sendPasswordResetLink(email);
    setResetMsg(error ? `Failed: ${error}` : `Reset link sent to ${email}`);
  }

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.users?.full_name?.toLowerCase().includes(q) ||
      e.users?.email?.toLowerCase().includes(q) ||
      e.employers?.company_name?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">All Employees</h1>
        <p className="dashboard-subtitle">Every employee across every company.</p>
      </div>

      <div className="dashboard-card">
        <input
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '11px 15px', fontSize: 14, border: 'none', borderRadius: 14,
            background: '#eef1f8', boxSizing: 'border-box',
          }}
        />
      </div>

      {resetMsg && (
        <div className="dashboard-card">
          <div className="invite-code-box" style={{ margin: 0 }}>{resetMsg}</div>
        </div>
      )}

      <div className="dashboard-card">
        {loading ? (
          <div className="dashboard-empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="dashboard-empty">No employees found.</div>
        ) : (
          filtered.map((e) => (
            <div className="list-row" key={e.id}>
              <div>
                <div className="list-row-title">{e.users?.full_name}</div>
                <div className="list-row-subtitle">
                  {e.users?.email} — {e.employers?.company_name} — ${e.pay_rate}/hr
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className={`status-pill ${e.active ? 'active' : 'pending'}`}>
                  {e.active ? 'Active' : 'Ex'}
                </span>
                <button className="dashboard-button" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => e.users && handleSendReset(e.users.email)}>
                  Send reset link
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}