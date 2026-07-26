import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useEmployeeRecord } from '../../hooks/useEmployeeRecord';

interface ShiftRow {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function EmployeeCalendar() {
  const { employee, loading: employeeLoading } = useEmployeeRecord();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (!employee) return;
    setLoading(true);
    supabase
      .from('shifts')
      .select('id, scheduled_start, scheduled_end, status')
      .eq('employee_id', employee.id)
      .then(({ data }) => {
        setShifts((data as ShiftRow[]) ?? []);
        setLoading(false);
      });
  }, [employee]);

  const shiftsByDay = useMemo(() => {
    const map = new Map<string, ShiftRow[]>();
    for (const shift of shifts) {
      const key = dateKey(new Date(shift.scheduled_start));
      const existing = map.get(key) ?? [];
      existing.push(shift);
      map.set(key, existing);
    }
    return map;
  }, [shifts]);

  function dayStatus(dayShifts: ShiftRow[] | undefined): 'none' | 'worked' | 'missed' | 'upcoming' | 'in-progress' {
    if (!dayShifts || dayShifts.length === 0) return 'none';
    if (dayShifts.some((s) => s.status === 'active' || s.status === 'employer_accepted')) return 'in-progress';
    if (dayShifts.some((s) => s.status === 'completed')) return 'worked';
    const now = Date.now();
    if (dayShifts.some((s) => s.status === 'scheduled' && new Date(s.scheduled_end).getTime() < now)) return 'missed';
    return 'upcoming';
  }

  if (employeeLoading || loading) return null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const monthLabel = viewDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const statusColors: Record<string, string> = {
    worked: 'rgba(74, 200, 130, 0.35)',
    missed: 'rgba(226, 75, 74, 0.35)',
    upcoming: 'rgba(127, 119, 221, 0.25)',
    'in-progress': 'rgba(226, 175, 74, 0.35)',
    none: 'transparent',
  };

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Calendar</h1>
        <p className="dashboard-subtitle">Green = worked, red = missed, purple = upcoming.</p>
      </div>

      <div className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button
            className="dashboard-button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
          >
            ← Prev
          </button>
          <h3 style={{ margin: 0, color: '#3f4162' }}>{monthLabel}</h3>
          <button
            className="dashboard-button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
          >
            Next →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#5b5d78' }}>
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const key = dateKey(date);
            const status = dayStatus(shiftsByDay.get(key));
            const isToday = dateKey(new Date()) === key;

            return (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  borderRadius: 12,
                  background: statusColors[status],
                  border: isToday ? '2px solid #534ab7' : '1px solid rgba(163,177,198,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  color: '#3f4162',
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}