import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

interface AuditRow {
  id: string;
  action: string;
  target_table: string;
  target_id: string;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  created_at: string;
  users: { full_name: string; email: string } | null;
}

interface GroupedCompany {
  employerId: string;
  companyName: string;
  logs: AuditRow[];
}

export default function AuditLog() {
  const [groups, setGroups] = useState<GroupedCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: logData } = await supabase
        .from('audit_log')
        .select('id, action, target_table, target_id, old_value, new_value, created_at, users(full_name, email)')
        .order('created_at', { ascending: false })
        .limit(200);

      const logs = (logData as unknown as AuditRow[]) ?? [];

      const periodIds = new Set<string>();
      for (const log of logs) {
        if (log.target_table === 'pay_periods') {
          periodIds.add(log.target_id);
        } else if (log.target_table === 'pay_summary_items') {
          const pid = log.new_value?.pay_period_id ?? log.old_value?.pay_period_id;
          if (pid) periodIds.add(pid);
        }
      }

      const { data: periods } = await supabase
        .from('pay_periods')
        .select('id, employer_id')
        .in('id', Array.from(periodIds));

      const periodToEmployer: Record<string, string> = {};
      for (const p of periods ?? []) periodToEmployer[p.id] = p.employer_id;

      const employerIds = new Set(Object.values(periodToEmployer));
      const { data: employers } = await supabase
        .from('employers')
        .select('id, company_name')
        .in('id', Array.from(employerIds));

      const employerToName: Record<string, string> = {};
      for (const e of employers ?? []) employerToName[e.id] = e.company_name;

      const byCompany: Record<string, GroupedCompany> = {};

      for (const log of logs) {
        let periodId: string | undefined;
        if (log.target_table === 'pay_periods') periodId = log.target_id;
        else if (log.target_table === 'pay_summary_items') {
          periodId = log.new_value?.pay_period_id ?? log.old_value?.pay_period_id;
        }

        const employerId = periodId ? periodToEmployer[periodId] : undefined;
        const key = employerId ?? 'unknown';
        const companyName = employerId ? (employerToName[employerId] ?? 'Unknown company') : 'Unlinked / deleted record';

        if (!byCompany[key]) {
          byCompany[key] = { employerId: key, companyName, logs: [] };
        }
        byCompany[key].logs.push(log);
      }

      const groupList = Object.values(byCompany).sort((a, b) => a.companyName.localeCompare(b.companyName));
      setGroups(groupList);
      setLoading(false);
    }
    load();
  }, []);

  const filteredGroups = groups.filter((g) => g.companyName.toLowerCase().includes(search.toLowerCase()));

  function toggleCompanyCollapse(key: string) {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Audit Log</h1>
        <p className="dashboard-subtitle">Every payroll change, grouped by company — most recent 200.</p>
      </div>

      <div className="dashboard-card">
        <input
          placeholder="Search by company name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '11px 15px', fontSize: 14, border: 'none', borderRadius: 14,
            background: '#eef1f8', boxSizing: 'border-box',
          }}
        />
      </div>

      {loading ? (
        <div className="dashboard-card">
          <div className="dashboard-empty">Loading...</div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="dashboard-card">
          <div className="dashboard-empty">No audit entries yet.</div>
        </div>
      ) : (
        filteredGroups.map((group) => {
          const collapsed = collapsedCompanies.has(group.employerId);
          return (
            <div className="dashboard-card" key={group.employerId}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => toggleCompanyCollapse(group.employerId)}
              >
                <h3 style={{ margin: 0, color: '#3f4162' }}>
                  {group.companyName} <span style={{ fontWeight: 400, fontSize: 13, color: '#5b5d78' }}>({group.logs.length} entries)</span>
                </h3>
                <span className="status-pill pending">{collapsed ? 'Show' : 'Hide'}</span>
              </div>

              {!collapsed && (
                <div style={{ marginTop: 14 }}>
                  {group.logs.map((log) => (
                    <div key={log.id} style={{ marginBottom: 8, borderBottom: '1px solid rgba(163,177,198,0.25)', paddingBottom: 8 }}>
                      <div
                        className="list-row"
                        style={{ borderBottom: 'none', cursor: 'pointer' }}
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      >
                        <div>
                          <div className="list-row-title">{log.action}</div>
                          <div className="list-row-subtitle">
                            {log.users?.full_name ?? 'System'} — {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span className="status-pill active">{expandedLogId === log.id ? 'Hide' : 'Details'}</span>
                      </div>

                      {expandedLogId === log.id && (
                        <div style={{ paddingLeft: 16, fontSize: 12, color: '#5b5d78' }}>
                          <div><strong>Before:</strong> {JSON.stringify(log.old_value)}</div>
                          <div><strong>After:</strong> {JSON.stringify(log.new_value)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}