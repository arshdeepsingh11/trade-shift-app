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

export default function EmployeeShifts() {
  const { employee, loading: employeeLoading } = useEmployeeRecord();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [actingShiftId, setActingShiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (employee) {
      loadShifts(employee.id);
    }
  }, [employee]);

  async function handleStartShift(shiftId: string) {
    setError(null);
    setActingShiftId(shiftId);

    const { lat, lng } = await getGeolocation();

    const { error: updateError } = await supabase
      .from('shifts')
      .update({
        status: 'active',
        actual_start: new Date().toISOString(),
        start_lat: lat,
        start_lng: lng,
      })
      .eq('id', shiftId);

    setActingShiftId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (employee) loadShifts(employee.id);
  }

  async function handleEndShift(shiftId: string) {
    setError(null);
    setActingShiftId(shiftId);

    const { lat, lng } = await getGeolocation();

    const { error: updateError } = await supabase
      .from('shifts')
      .update({
        status: 'completed',
        actual_end: new Date().toISOString(),
        end_lat: lat,
        end_lng: lng,
      })
      .eq('id', shiftId);

    setActingShiftId(null);

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
          <p className="dashboard-subtitle">Clock in and out, and see your assigned shifts.</p>
        </div>
        <div className="dashboard-card">
          <div className="dashboard-error">
            We couldn't find your employee profile. Please contact your employer or try logging out and back in.
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Your Shifts</h1>
        <p className="dashboard-subtitle">Clock in and out, and see your assigned shifts.</p>
      </div>

      {error && (
        <div className="dashboard-card">
          <div className="dashboard-error">{error}</div>
        </div>
      )}

      <div className="dashboard-card">
        {listLoading ? (
          <div className="dashboard-empty">Loading...</div>
        ) : shifts.length === 0 ? (
          <div className="dashboard-empty">No shifts assigned yet.</div>
        ) : (
          shifts.map((shift) => {
            const acting = actingShiftId === shift.id;

            return (
              <div className="list-row" key={shift.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="list-row-title">{shift.sites?.name ?? 'Unknown site'}</div>
                    <div className="list-row-subtitle">
                      {new Date(shift.scheduled_start).toLocaleString()} → {new Date(shift.scheduled_end).toLocaleString()}
                    </div>
                  </div>

                  {shift.status === 'completed' && <span className="status-pill active">Completed</span>}
                  {shift.status === 'active' && <span className="status-pill active">In progress</span>}
                  {shift.status === 'employer_accepted' && <span className="status-pill active">Started by employer</span>}
                  {shift.status === 'scheduled' && <span className="status-pill pending">Scheduled</span>}
                </div>

                {shift.status === 'scheduled' && (
                  <button
                    className="dashboard-button"
                    style={{ marginTop: 10, alignSelf: 'flex-start' }}
                    disabled={acting}
                    onClick={() => handleStartShift(shift.id)}
                  >
                    {acting ? 'Starting...' : 'Start Shift'}
                  </button>
                )}

                {(shift.status === 'active' || shift.status === 'employer_accepted') && (
                  <button
                    className="dashboard-button"
                    style={{ marginTop: 10, alignSelf: 'flex-start' }}
                    disabled={acting}
                    onClick={() => handleEndShift(shift.id)}
                  >
                    {acting ? 'Ending...' : 'End Shift'}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}