import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

interface CompanyRow {
  id: string;
  company_name: string;
  pay_frequency: string;
  pay_method: string;
  users: { full_name: string; email: string } | null;
  employeeCount: number;
}

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: employers } = await supabase
        .from('employers')
        .select('id, company_name, pay_frequency, pay_method, users(full_name, email)');

      const { data: employees } = await supabase.from('employees').select('id, employer_id');

      const counts: Record<string, number> = {};
      for (const e of employees ?? []) {
        counts[e.employer_id] = (counts[e.employer_id] ?? 0) + 1;
      }

      const rows = (employers ?? []).map((e: any) => ({
        ...e,
        employeeCount: counts[e.id] ?? 0,
      }));

      setCompanies(rows);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.company_name.toLowerCase().includes(q) ||
      c.users?.full_name?.toLowerCase().includes(q) ||
      c.users?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Companies</h1>
        <p className="dashboard-subtitle">Every company on the platform.</p>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-field" style={{ marginBottom: 0 }}>
          <input
            placeholder="Search by company, owner name, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: '100%' }}
          />
        </div>
      </div>

      <div className="dashboard-card">
        {loading ? (
          <div className="dashboard-empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="dashboard-empty">No companies found.</div>
        ) : (
          filtered.map((c) => (
            <div
              className="list-row"
              key={c.id}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/admin/companies/${c.id}`)}
            >
              <div>
                <div className="list-row-title">{c.company_name}</div>
                <div className="list-row-subtitle">
                  {c.users?.full_name} — {c.users?.email} — {c.employeeCount} employees
                </div>
              </div>
              <span className="status-pill active">
                {c.pay_frequency} / {c.pay_method}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}