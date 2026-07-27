import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useEmployer } from '../../hooks/useEmployer';
import type { PayPeriod } from '../../types';

interface SummaryItemRow {
  id: string;
  employee_id: string;
  hours_worked: number;
  pay_rate: number;
  total_pay: number;
  edited: boolean;
  employees: { users: { full_name: string } | null } | null;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function periodLengthDays(frequency: string): number {
  if (frequency === 'weekly') return 7;
  if (frequency === 'biweekly') return 14;
  return 30; // monthly, approximate
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function Pay() {
  const { employer, loading: employerLoading } = useEmployer();
  const [periods, setPeriods] = useState<PayPeriod[]>([]);
  const [itemsByPeriod, setItemsByPeriod] = useState<Record<string, SummaryItemRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ itemId: string; value: string } | null>(null);

  async function loadPeriods(employerId: string) {
    setLoading(true);
    const { data } = await supabase
      .from('pay_periods')
      .select('*')
      .eq('employer_id', employerId)
      .order('period_start', { ascending: false });

    setPeriods((data as PayPeriod[]) ?? []);
    setLoading(false);
  }

  async function loadItems(periodId: string) {
    const { data } = await supabase
      .from('pay_summary_items')
      .select('id, employee_id, hours_worked, pay_rate, total_pay, edited, employees(users(full_name))')
      .eq('pay_period_id', periodId);

    setItemsByPeriod((prev) => ({ ...prev, [periodId]: (data as unknown as SummaryItemRow[]) ?? [] }));
  }

  useEffect(() => {
    if (employer) loadPeriods(employer.id);
  }, [employer]);

  useEffect(() => {
    periods.forEach((p) => loadItems(p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periods]);

  async function handleGeneratePeriod() {
    if (!employer) return;
    setError(null);
    setGenerating(true);

    const lengthDays = periodLengthDays(employer.pay_frequency);
    const lastPeriod = periods[0];
    const periodStart = lastPeriod
      ? addDays(new Date(lastPeriod.period_end), 1)
      : new Date(employer.created_at);
    const periodEnd = addDays(periodStart, lengthDays - 1);
    const payDate = addDays(periodEnd, 3);

    const { data: newPeriod, error: periodError } = await supabase
      .from('pay_periods')
      .insert({
        employer_id: employer.id,
        period_start: toDateStr(periodStart),
        period_end: toDateStr(periodEnd),
        pay_date: toDateStr(payDate),
        status: 'pending',
      })
      .select()
      .single();

    if (periodError || !newPeriod) {
      setGenerating(false);
      setError(periodError?.message ?? 'Could not create pay period.');
      return;
    }

    const { data: employees } = await supabase
      .from('employees')
      .select('id, pay_rate')
      .eq('employer_id', employer.id)
      .eq('active', true);

    for (const emp of employees ?? []) {
      const { data: shifts } = await supabase
        .from('shifts')
        .select('actual_start, actual_end, site_id, sites!inner(employer_id)')
        .eq('employee_id', emp.id)
        .eq('status', 'completed')
        .gte('actual_start', periodStart.toISOString())
        .lte('actual_start', addDays(periodEnd, 1).toISOString());

      let totalHours = 0;
      for (const s of shifts ?? []) {
        if (s.actual_start && s.actual_end) {
          totalHours +=
            (new Date(s.actual_end).getTime() - new Date(s.actual_start).getTime()) / (1000 * 60 * 60);
        }
      }

      await supabase.from('pay_summary_items').insert({
        pay_period_id: newPeriod.id,
        employee_id: emp.id,
        hours_worked: Math.round(totalHours * 100) / 100,
        pay_rate: emp.pay_rate,
      });
    }

    setGenerating(false);
    loadPeriods(employer.id);
  }

  async function handleMarkPaid(periodId: string) {
    await supabase.from('pay_periods').update({ status: 'paid' }).eq('id', periodId);
    if (employer) loadPeriods(employer.id);
  }

  async function handleSaveEdit(itemId: string, periodId: string) {
    if (!editing) return;
    const hours = parseFloat(editing.value);
    if (isNaN(hours) || hours < 0) {
      setError('Please enter a valid number of hours.');
      return;
    }

    await supabase
      .from('pay_summary_items')
      .update({ hours_worked: hours, edited: true })
      .eq('id', itemId);

    setEditing(null);
    loadItems(periodId);
  }

  if (employerLoading) return null;

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Pay</h1>
        <p className="dashboard-subtitle">
          Gross pay summaries (before tax deductions). Pay frequency: {employer?.pay_frequency}.
        </p>
      </div>

      <div className="dashboard-card">
        {error && <div className="dashboard-error">{error}</div>}
        <button className="dashboard-button" disabled={generating} onClick={handleGeneratePeriod}>
          {generating ? 'Generating...' : 'Generate next pay period'}
        </button>
      </div>

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#3f4162' }}>Pay periods</h3>
        {loading ? (
          <div className="dashboard-empty">Loading...</div>
        ) : periods.length === 0 ? (
          <div className="dashboard-empty">No pay periods yet — generate your first one above.</div>
        ) : (
          periods.map((period) => {
            const items = itemsByPeriod[period.id] ?? [];
            const periodTotal = items.reduce((sum, i) => sum + Number(i.total_pay), 0);

            return (
              <div key={period.id} style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(163,177,198,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div className="list-row-title">
                      {period.period_start} → {period.period_end}
                    </div>
                    <div className="list-row-subtitle">Pay date: {period.pay_date}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className={`status-pill ${period.status === 'paid' ? 'active' : 'pending'}`}>
                      {period.status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                    {period.status !== 'paid' && (
                      <button className="dashboard-button" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => handleMarkPaid(period.id)}>
                        Mark as paid
                      </button>
                    )}
                  </div>
                </div>

                {items.map((item) => (
                  <div className="list-row" key={item.id}>
                    <div>
                      <div className="list-row-title">{item.employees?.users?.full_name ?? 'Unknown'}</div>
                      <div className="list-row-subtitle">
                        {editing?.itemId === item.id ? (
                          <>
                            <input
                              type="number"
                              step="0.01"
                              value={editing.value}
                              onChange={(e) => setEditing({ itemId: item.id, value: e.target.value })}
                              style={{ width: 80, marginRight: 8 }}
                            />
                            hrs × ${item.pay_rate}/hr
                          </>
                        ) : (
                          <>
                            {item.hours_worked} hrs × ${item.pay_rate}/hr{item.edited ? ' (edited)' : ''}
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="status-pill active">${Number(item.total_pay).toFixed(2)}</span>
                      {period.status !== 'paid' && (
                        editing?.itemId === item.id ? (
                          <button className="dashboard-button" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => handleSaveEdit(item.id, period.id)}>
                            Save
                          </button>
                        ) : (
                          <button
                            className="dashboard-button"
                            style={{ padding: '6px 14px', fontSize: 12 }}
                            onClick={() => setEditing({ itemId: item.id, value: String(item.hours_worked) })}
                          >
                            Edit
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}

                <div className="invite-code-box" style={{ marginTop: 12 }}>
                  Period total:
                  <div className="invite-code-value">${periodTotal.toFixed(2)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}