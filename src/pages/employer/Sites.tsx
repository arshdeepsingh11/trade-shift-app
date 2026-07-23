import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useEmployer } from '../../hooks/useEmployer';
import type { Site } from '../../types';

export default function Sites() {
  const { employer, loading: employerLoading } = useEmployer();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sites, setSites] = useState<Site[]>([]);
  const [listLoading, setListLoading] = useState(true);

  async function loadSites(employerId: string) {
    setListLoading(true);
    const { data } = await supabase
      .from('sites')
      .select('*')
      .eq('employer_id', employerId)
      .order('created_at', { ascending: false });

    setSites((data as Site[]) ?? []);
    setListLoading(false);
  }

  useEffect(() => {
    if (employer) {
      loadSites(employer.id);
    }
  }, [employer]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!employer) {
      setError('Could not find your employer account.');
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from('sites').insert({
      employer_id: employer.id,
      name,
      start_date: startDate || null,
      end_date: endDate || null,
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setName('');
    setStartDate('');
    setEndDate('');
    loadSites(employer.id);
  }

  if (employerLoading) return null;

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Sites</h1>
        <p className="dashboard-subtitle">Manage the job sites your team works on.</p>
      </div>

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#33344a' }}>Add a site</h3>
        <form onSubmit={handleCreate}>
          <div className="dashboard-field">
            <label>Site name</label>
            <input
              placeholder="e.g. Cochrane"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="dashboard-field">
            <label>Start date (optional)</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>

          <div className="dashboard-field">
            <label>End date (optional)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          {error && <div className="dashboard-error">{error}</div>}

          <button className="dashboard-button" type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add site'}
          </button>
        </form>
      </div>

      <div className="dashboard-card">
        <h3 style={{ marginTop: 0, color: '#33344a' }}>Your sites</h3>
        {listLoading ? (
          <div className="dashboard-empty">Loading...</div>
        ) : sites.length === 0 ? (
          <div className="dashboard-empty">No sites yet — add your first one above.</div>
        ) : (
          sites.map((site) => (
            <div className="list-row" key={site.id}>
              <div>
                <div className="list-row-title">{site.name}</div>
                <div className="list-row-subtitle">
                  {site.start_date ? `${site.start_date} → ${site.end_date ?? 'ongoing'}` : 'No dates set'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}