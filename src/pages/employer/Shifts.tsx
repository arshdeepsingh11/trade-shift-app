import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useEmployer } from '../../hooks/useEmployer';
import { useAuth } from '../../hooks/useAuth';

interface SiteOption {
  id: string;
  name: string;
}

interface EmployeeOption {
  id: string;
  users: { full_name: string } | null;
}

interface ShiftRow {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  actual_start: string | null;
  sites: { name: string } | null;
  employees: { users: { full_name: string } | null } | null;
}

function minutesLate(scheduledStart: string): number {
  const diffMs = Date.now() - new Date(scheduledStart).getTime();
  return Math.floor(diffMs / 60000);
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Shifts() {
  const { employer, loading: employerLoading } = useEmployer();
  const { profile } = useAuth();

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [siteId, setSiteId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [acceptingShiftId, setAcceptingShiftId] = useState<string | null>(null);
  const [acceptTime, setAcceptTime] = useState('');
  const [accepting, setAccepting] = useState(false);

  async function loadAll(employerId: string) {
    setListLoading(true);

    const { data: siteData } = await supabase
      .from('sites')
      .select('id, name')
      .eq('employer_id', employerId);

    const { data: employeeData } = await supabase
      .from('employees')
      .select('id, users(full_name)')
      .eq('employer_id', employerId);

    const { data: shiftData } = await supabase
      .from('shifts')
      .select('id, scheduled_start, scheduled_end, status, actual_start, sites!inner(name, employer_id), employees(users(full_name))')
      .eq('sites.employer_id', employerId)
      .order('scheduled_start', { ascending: false });

    setSites((siteData as SiteOption[]) ?? []);
    setEmployees((employeeData as unknown as EmployeeOption[]) ?? []);
    setShifts((shiftData as unknown as ShiftRow[]) ?? []);
    setListLoading(false);
  }

  useEffect(() => {
    if (employer) {
      loadAll(employer.id);
    }
  }, [employer]);

  async function handleCreateShift(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!siteId || !employeeId || !scheduledStart || !scheduledEnd) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from('shifts').insert({
      site_id: siteId,
      employee_id: employeeId,
      scheduled_start: new Date(scheduledStart).toISOString(),
      scheduled_end: new Date(scheduledEnd).toISOString(),
      status: 'scheduled',
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSiteId('');
    setEmployeeId('');
    setScheduledStart('');
    setScheduledEnd('');
    if (employer) loadAll(employer.id);
  }

  function startAccepting(shift: ShiftRow) {
    setAcceptingShiftId(shift.id);
    setAcceptTime(toLocalDateTimeInputValue(new Date()));
  }

  async function confirmAccept(shiftId: string) {
    if (!acceptTime || !profile) return;
    setAccepting(true);

    const { error: updateError } = await supabase
      .from('shifts')
      .update({
        status: 'employer_accepted',
        actual_start: new Date(acceptTime).toISOString(),
        accepted_by_employer_at: new Date().toISOString(),
        accepted_by_user_id: profile.id,
      })
      .eq('id', shiftId);

    setAccepting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setAcceptingShiftId(null);
    if (employer) loadAll(employer.id);
  }

  if (employerLoading) return null;

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Shifts</h1>
        <p className="dashboard-subtitle">Create and assign shifts to your team.</p>
      </div>

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#3f4162' }}>Create a shift</h3>

        {sites.length === 0 || employees.length === 0 ? (
          <div className="dashboard-empty">
            You need at least one site and one employee before creating a shift.
          </div>
        ) : (
          <form onSubmit={handleCreateShift}>
            <div className="dashboard-field">
              <label>Site</label>
              <select value={siteId} onChange={(e) => setSiteId(e.target.value)} required>
                <option value="">Select a site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="dashboard-field">
              <label>Employee</label>
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
                <option value="">Select an employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.users?.full_name ?? 'Unknown'}</option>
                ))}
              </select>
            </div>

            <div className="dashboard-field">
              <label>Scheduled start</label>
              <input
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
                required
              />
            </div>

            <div className="dashboard-field">
              <label>Scheduled end</label>
              <input
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
                required
              />
            </div>

            {error && <div className="dashboard-error">{error}</div>}

            <button className="dashboard-button" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create shift'}
            </button>
          </form>
        )}
      </div>

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#3f4162' }}>All shifts</h3>
        {listLoading ? (
          <div className="dashboard-empty">Loading...</div>
        ) : shifts.length === 0 ? (
          <div className="dashboard-empty">No shifts yet — create your first one above.</div>
        ) : (
          shifts.map((shift) => {
            const late = shift.status === 'scheduled' ? minutesLate(shift.scheduled_start) : null;
            const isLate = late !== null && late > 0;

            return (
              <div className="list-row" key={shift.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="list-row-title">
                      {shift.employees?.users?.full_name ?? 'Unknown'} — {shift.sites?.name ?? 'Unknown site'}
                    </div>
                    <div className="list-row-subtitle">
                      {new Date(shift.scheduled_start).toLocaleString()} → {new Date(shift.scheduled_end).toLocaleString()}
                    </div>
                  </div>

                  {shift.status === 'completed' && <span className="status-pill active">Completed</span>}
                  {shift.status === 'active' && <span className="status-pill active">In progress</span>}
                  {shift.status === 'employer_accepted' && <span className="status-pill active">Accepted (late)</span>}
                  {shift.status === 'scheduled' && !isLate && <span className="status-pill pending">Scheduled</span>}
                  {shift.status === 'scheduled' && isLate && (
                    <span className="status-pill pending">{late} min late</span>
                  )}
                </div>

                {shift.status === 'scheduled' && isLate && acceptingShiftId !== shift.id && (
                  <button
                    className="dashboard-button"
                    style={{ marginTop: 10, alignSelf: 'flex-start' }}
                    onClick={() => startAccepting(shift)}
                  >
                    Accept late shift
                  </button>
                )}

                {acceptingShiftId === shift.id && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div className="dashboard-field" style={{ marginBottom: 0 }}>
                      <label>Start time</label>
                      <input
                        type="datetime-local"
                        value={acceptTime}
                        onChange={(e) => setAcceptTime(e.target.value)}
                      />
                    </div>
                    <button
                      className="dashboard-button"
                      disabled={accepting}
                      onClick={() => confirmAccept(shift.id)}
                    >
                      {accepting ? 'Saving...' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcceptingShiftId(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#5b5d78',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}