import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useEmployeeRecord } from '../../hooks/useEmployeeRecord';

interface ShiftRow {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  actual_start: string | null;
  actual_end: string | null;
  sites: { name: string } | null;
}

type FilterOption = '7d' | '30d' | 'custom';

function getGeolocation(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: null, lng: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { timeout: 8000 }
    );
  });
}

function hoursBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

export default function EmployeeShifts() {
  const { employee, loading: employeeLoading } = useEmployeeRecord();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterOption>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  async function loadShifts(employeeId: string) {
    setListLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('shifts')
        .select('id, scheduled_start, scheduled_end, status, actual_start, actual_end, sites(name)')
        .eq('employee_id', employeeId)
        .order('scheduled_start', { ascending: false });

      if (fetchError) {
        console.error('Failed to load shifts:', fetchError);
        setError(fetchError.message);
      }
      setShifts((data as unknown as ShiftRow[]) ?? []);
    } catch (err) {
      console.error('Unexpected error loading shifts:', err);
      setError('Something went wrong loading your shifts.');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (employee) loadShifts(employee.id);
  }, [employee]);

  async function handleStartShift(shiftId: string) {
    setError(null);
    setActing(true);
    const { lat, lng } = await getGeolocation();

    const { error: updateError } = await supabase
      .from('shifts')
      .update({ status: 'active', actual_start: new Date().toISOString(), start_lat: lat, start_lng: lng })
      .eq('id', shiftId);

    setActing(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (employee) loadShifts(employee.id);
  }

  async function handleEndShift(shiftId: string) {
    setError(null);
    setActing(true);
    const { lat, lng } = await getGeolocation();

    const { error: updateError } = await supabase
      .from('shifts')
      .update({ status: 'completed', actual_end: new Date().toISOString(), end_lat: lat, end_lng: lng })
      .eq('id', shiftId);

    setActing(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (employee) loadShifts(employee.id);
  }

  if (employeeLoading) return null;

  if (!employee) {
    return (
      <>
        <div className="dashboard-header">
          <h1 className="dashboard-title">Your Shifts</h1>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-error">
            We couldn't find your employee profile. Please contact your employer or try logging out and back in.
          </div>
        </div>
      </>
    );
  }

  const inProgress = shifts.find((s) => s.status === 'active' || s.status === 'employer_accepted');
  const now = Date.now();
  const upcoming = shifts
    .filter((s) => s.status === 'scheduled' && new Date(s.scheduled_start).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
  const nextShift = !inProgress ? upcoming[0] : undefined;
  const currentShift = inProgress ?? nextShift;

  const filterStart = (() => {
    if (filter === '7d') return new Date(Date.now() - 7 * 86400000);
    if (filter === '30d') return new Date(Date.now() - 30 * 86400000);
    return customStart ? new Date(customStart) : null;
  })();
  const filterEnd = filter === 'custom' && customEnd ? new Date(customEnd) : new Date();

  const history = shifts.filter((s) => {
    if (s.status !== 'completed' || !s.actual_start) return false;
    const d = new Date(s.actual_start);
    if (filterStart && d < filterStart) return false;
    if (d > filterEnd) return false;
    return true;
  });

  const totalHours = history.reduce(
    (sum, s) => sum + (s.actual_start && s.actual_end ? hoursBetween(s.actual_start, s.actual_end) : 0),
    0
  );

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Your Shifts</h1>
        <p className="dashboard-subtitle">Clock in and out, and track your hours.</p>
      </div>

      {error && (
        <div className="dashboard-card">
          <div className="dashboard-error">{error}</div>
        </div>
      )}

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#3f4162' }}>Current shift</h3>
        {!currentShift ? (
          <div className="dashboard-empty">No active or upcoming shift.</div>
        ) : (
          <div>
            <div className="list-row-title" style={{ fontSize: 16 }}>
              {currentShift.sites?.name ?? 'Unknown site'}
            </div>
            <div className="list-row-subtitle" style={{ marginBottom: 16 }}>
              {new Date(currentShift.scheduled_start).toLocaleString()} → {new Date(currentShift.scheduled_end).toLocaleString()}
            </div>

            {currentShift.status === 'scheduled' && (
              <button
                className="dashboard-button"
                disabled={acting}
                onClick={() => handleStartShift(currentShift.id)}
                style={{ fontSize: 16, padding: '14px 28px' }}
              >
                {acting ? 'Starting...' : 'Start Shift'}
              </button>
            )}

            {(currentShift.status === 'active' || currentShift.status === 'employer_accepted') && (
              <button
                className="dashboard-button"
                disabled={acting}
                onClick={() => handleEndShift(currentShift.id)}
                style={{ fontSize: 16, padding: '14px 28px', background: 'linear-gradient(135deg, #e26b6b, #b53d3d)' }}
              >
                {acting ? 'Ending...' : 'End Shift'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#3f4162' }}>Shift history</h3>

        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <button
            className="dashboard-button"
            style={{ opacity: filter === '7d' ? 1 : 0.5 }}
            onClick={() => setFilter('7d')}
          >
            Last 7 days
          </button>
          <button
            className="dashboard-button"
            style={{ opacity: filter === '30d' ? 1 : 0.5 }}
            onClick={() => setFilter('30d')}
          >
            Last 30 days
          </button>
          <button
            className="dashboard-button"
            style={{ opacity: filter === 'custom' ? 1 : 0.5 }}
            onClick={() => setFilter('custom')}
          >
            Custom range
          </button>

          {filter === 'custom' && (
            <>
              <div className="dashboard-field" style={{ marginBottom: 0 }}>
                <label>From</label>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div className="dashboard-field" style={{ marginBottom: 0 }}>
                <label>To</label>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
        </div>

        <div className="invite-code-box" style={{ marginBottom: 16, marginTop: 0 }}>
          Total hours worked in this range:
          <div className="invite-code-value">{totalHours.toFixed(1)} hrs</div>
        </div>

        {listLoading ? (
          <div className="dashboard-empty">Loading...</div>
        ) : history.length === 0 ? (
          <div className="dashboard-empty">No completed shifts in this range.</div>
        ) : (
          history.map((shift) => (
            <div className="list-row" key={shift.id}>
              <div>
                <div className="list-row-title">{shift.sites?.name ?? 'Unknown site'}</div>
                <div className="list-row-subtitle">
                  {shift.actual_start && new Date(shift.actual_start).toLocaleString()} →{' '}
                  {shift.actual_end && new Date(shift.actual_end).toLocaleString()}
                </div>
              </div>
              <span className="status-pill active">
                {shift.actual_start && shift.actual_end
                  ? `${hoursBetween(shift.actual_start, shift.actual_end).toFixed(1)} hrs`
                  : ''}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}