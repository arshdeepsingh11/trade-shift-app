import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { sendPasswordResetLink } from '../../lib/passwordReset';
import type { PayFrequency, PayMethod } from '../../types';

interface EmployerDetail {
  id: string;
  company_name: string;
  pay_frequency: PayFrequency;
  pay_method: PayMethod;
  users: { full_name: string; email: string } | null;
}

interface EmployeeDetail {
  id: string;
  pay_rate: number;
  active: boolean;
  users: { full_name: string; email: string } | null;
}

interface ShiftDetail {
  id: string;
  scheduled_start: string;
  status: string;
  actual_start: string | null;
  actual_end: string | null;
  start_lat: number | null;
  start_lng: number | null;
  end_lat: number | null;
  end_lng: number | null;
  sites: { name: string } | null;
}

interface PaySummaryDetail {
  id: string;
  hours_worked: number;
  total_pay: number;
  pay_periods: { period_start: string; period_end: string; status: string } | null;
}

export default function CompanyDetail() {
  const { employerId } = useParams<{ employerId: string }>();
  const [tab, setTab] = useState<'employer' | 'employees'>('employer');
  const [employer, setEmployer] = useState<EmployerDetail | null>(null);
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shifts, setShifts] = useState<ShiftDetail[]>([]);
  const [paySummaries, setPaySummaries] = useState<PaySummaryDetail[]>([]);

  const [payFrequency, setPayFrequency] = useState<PayFrequency>('biweekly');
  const [payMethod, setPayMethod] = useState<PayMethod>('direct_deposit');
  const [saving, setSaving] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!employerId) return;

    supabase
      .from('employers')
      .select('id, company_name, pay_frequency, pay_method, users(full_name, email)')
      .eq('id', employerId)
      .single()
      .then(({ data }) => {
        const e = data as unknown as EmployerDetail;
        setEmployer(e);
        if (e) {
          setPayFrequency(e.pay_frequency);
          setPayMethod(e.pay_method);
        }
      });

    supabase
      .from('employees')
      .select('id, pay_rate, active, users(full_name, email)')
      .eq('employer_id', employerId)
      .then(({ data }) => setEmployees((data as unknown as EmployeeDetail[]) ?? []));
  }, [employerId]);

  async function handleSavePolicy() {
    if (!employerId) return;
    setSaving(true);
    await supabase
      .from('employers')
      .update({ pay_frequency: payFrequency, pay_method: payMethod })
      .eq('id', employerId);
    setSaving(false);
  }

  async function handleSendReset(email: string) {
    setResetMsg(null);
    const { error } = await sendPasswordResetLink(email);
    setResetMsg(error ? `Failed: ${error}` : `Reset link sent to ${email}`);
  }

  async function toggleExpand(empId: string) {
    if (expandedId === empId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(empId);

    const { data: shiftData } = await supabase
      .from('shifts')
      .select('id, scheduled_start, status, actual_start, actual_end, start_lat, start_lng, end_lat, end_lng, sites(name)')
      .eq('employee_id', empId)
      .order('scheduled_start', { ascending: false })
      .limit(10);
    setShifts((shiftData as unknown as ShiftDetail[]) ?? []);

    const { data: payData } = await supabase
      .from('pay_summary_items')
      .select('id, hours_worked, total_pay, pay_periods(period_start, period_end, status)')
      .eq('employee_id', empId);
    setPaySummaries((payData as unknown as PaySummaryDetail[]) ?? []);
  }

  return (
    <>
      <div className="dashboard-header">
        <p style={{ marginBottom: 8 }}>
          <Link to="/admin/companies" style={{ color: '#534ab7', fontSize: 13, fontWeight: 600 }}>
            ← Back to companies
          </Link>
        </p>
        <h1 className="dashboard-title">{employer?.company_name ?? 'Loading...'}</h1>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className="dashboard-button" style={{ opacity: tab === 'employer' ? 1 : 0.5 }} onClick={() => setTab('employer')}>
          Employer
        </button>
        <button className="dashboard-button" style={{ opacity: tab === 'employees' ? 1 : 0.5 }} onClick={() => setTab('employees')}>
          Employees ({employees.length})
        </button>
      </div>

      {tab === 'employer' && employer && (
        <>
          <div className="dashboard-card">
            <h3 style={{ marginTop: 0, color: '#3f4162' }}>Login info</h3>
            <div className="list-row">
              <div>
                <div className="list-row-title">{employer.users?.full_name}</div>
                <div className="list-row-subtitle">{employer.users?.email}</div>
              </div>
              <button className="dashboard-button" onClick={() => employer.users && handleSendReset(employer.users.email)}>
                Send reset link
              </button>
            </div>
            {resetMsg && <div className="invite-code-box" style={{ marginTop: 12 }}>{resetMsg}</div>}
          </div>

          <div className="dashboard-card">
            <h3 style={{ marginTop: 0, color: '#3f4162' }}>Pay policy (super admin override)</h3>
            <div className="dashboard-field">
              <label>Pay frequency</label>
              <select value={payFrequency} onChange={(e) => setPayFrequency(e.target.value as PayFrequency)}>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="dashboard-field">
              <label>Pay method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PayMethod)}>
                <option value="direct_deposit">Direct deposit</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <button className="dashboard-button" disabled={saving} onClick={handleSavePolicy}>
              {saving ? 'Saving...' : 'Save override'}
            </button>
          </div>
        </>
      )}

      {tab === 'employees' && (
        <div className="dashboard-card">
          {employees.length === 0 ? (
            <div className="dashboard-empty">No employees yet.</div>
          ) : (
            employees.map((emp) => (
              <div key={emp.id} style={{ marginBottom: 12, borderBottom: '1px solid rgba(163,177,198,0.25)', paddingBottom: 12 }}>
                <div className="list-row" style={{ borderBottom: 'none', padding: '8px 4px' }}>
                  <div>
                    <div className="list-row-title">{emp.users?.full_name}</div>
                    <div className="list-row-subtitle">
                      {emp.users?.email} — ${emp.pay_rate}/hr
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`status-pill ${emp.active ? 'active' : 'pending'}`}>
                      {emp.active ? 'Active' : 'Ex'}
                    </span>
                    <button className="dashboard-button" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => emp.users && handleSendReset(emp.users.email)}>
                      Send reset link
                    </button>
                    <button className="dashboard-button" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => toggleExpand(emp.id)}>
                      {expandedId === emp.id ? 'Hide' : 'View details'}
                    </button>
                  </div>
                </div>

                {expandedId === emp.id && (
                  <div style={{ paddingLeft: 16 }}>
                    <h4 style={{ color: '#3f4162', marginBottom: 6 }}>Recent shifts</h4>
                    {shifts.length === 0 ? (
                      <div className="dashboard-empty">No shifts.</div>
                    ) : (
                      shifts.map((s) => (
                        <div className="list-row-subtitle" key={s.id} style={{ marginBottom: 6 }}>
                          {s.sites?.name} — {new Date(s.scheduled_start).toLocaleString()} — {s.status}
                          {s.start_lat && s.start_lng && (
                            <> — start: {s.start_lat.toFixed(4)}, {s.start_lng.toFixed(4)}</>
                          )}
                          {s.end_lat && s.end_lng && (
                            <> — end: {s.end_lat.toFixed(4)}, {s.end_lng.toFixed(4)}</>
                          )}
                        </div>
                      ))
                    )}

                    <h4 style={{ color: '#3f4162', margin: '12px 0 6px' }}>Pay stubs</h4>
                    {paySummaries.length === 0 ? (
                      <div className="dashboard-empty">No pay stubs.</div>
                    ) : (
                      paySummaries.map((p) => (
                        <div className="list-row-subtitle" key={p.id} style={{ marginBottom: 6 }}>
                          {p.pay_periods?.period_start} → {p.pay_periods?.period_end} — {p.hours_worked} hrs — $
                          {Number(p.total_pay).toFixed(2)} — {p.pay_periods?.status}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}