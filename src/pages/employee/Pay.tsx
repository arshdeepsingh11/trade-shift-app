import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useEmployeeRecord } from '../../hooks/useEmployeeRecord';

interface PaySummaryRow {
  id: string;
  hours_worked: number;
  pay_rate: number;
  total_pay: number;
  pay_periods: { period_start: string; period_end: string; pay_date: string; status: string } | null;
}

export default function EmployeePay() {
  const { employee, loading: employeeLoading } = useEmployeeRecord();
  const [items, setItems] = useState<PaySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employee) return;
    setLoading(true);
    supabase
      .from('pay_summary_items')
      .select('id, hours_worked, pay_rate, total_pay, pay_periods(period_start, period_end, pay_date, status)')
      .eq('employee_id', employee.id)
      .then(({ data }) => {
        setItems((data as unknown as PaySummaryRow[]) ?? []);
        setLoading(false);
      });
  }, [employee]);

  if (employeeLoading || loading) return null;

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Pay</h1>
        <p className="dashboard-subtitle">Your gross pay history (before tax deductions).</p>
      </div>

      <div className="dashboard-card">
        {items.length === 0 ? (
          <div className="dashboard-empty">No pay summaries yet.</div>
        ) : (
          items
            .sort((a, b) => (b.pay_periods?.pay_date ?? '').localeCompare(a.pay_periods?.pay_date ?? ''))
            .map((item) => (
              <div className="list-row" key={item.id}>
                <div>
                  <div className="list-row-title">
                    {item.pay_periods?.period_start} → {item.pay_periods?.period_end}
                  </div>
                  <div className="list-row-subtitle">
                    {item.hours_worked} hrs × ${item.pay_rate}/hr — Pay date: {item.pay_periods?.pay_date}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className={`status-pill ${item.pay_periods?.status === 'paid' ? 'active' : 'pending'}`}>
                    {item.pay_periods?.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                  <span className="status-pill active">${Number(item.total_pay).toFixed(2)}</span>
                </div>
              </div>
            ))
        )}
      </div>
    </>
  );
}