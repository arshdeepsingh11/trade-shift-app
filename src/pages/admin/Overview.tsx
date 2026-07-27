import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function AdminOverview() {
  const [counts, setCounts] = useState({ employers: 0, employees: 0, shifts: 0 });

  useEffect(() => {
    Promise.all([
      supabase.from('employers').select('id', { count: 'exact', head: true }),
      supabase.from('employees').select('id', { count: 'exact', head: true }),
      supabase.from('shifts').select('id', { count: 'exact', head: true }),
    ]).then(([e, emp, s]) => {
      setCounts({
        employers: e.count ?? 0,
        employees: emp.count ?? 0,
        shifts: s.count ?? 0,
      });
    });
  }, []);

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Platform Overview</h1>
        <p className="dashboard-subtitle">Full visibility across every company on the platform.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="dashboard-card">
          <div className="list-row-subtitle">Companies</div>
          <div className="invite-code-value">{counts.employers}</div>
        </div>
        <div className="dashboard-card">
          <div className="list-row-subtitle">Employees</div>
          <div className="invite-code-value">{counts.employees}</div>
        </div>
        <div className="dashboard-card">
          <div className="list-row-subtitle">Shifts logged</div>
          <div className="invite-code-value">{counts.shifts}</div>
        </div>
      </div>
    </>
  );
}