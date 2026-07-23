import { useAuth } from '../../hooks/useAuth';

export default function EmployerOverview() {
  const { profile } = useAuth();

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Welcome{profile ? `, ${profile.full_name}` : ''}</h1>
        <p className="dashboard-subtitle">Here's a quick look at your business.</p>
      </div>

      <div className="dashboard-card">
        <p style={{ margin: 0, color: '#5b5d78', fontSize: 14 }}>
          Overview widgets (active sites, employees, upcoming shifts) will go here.
        </p>
      </div>
    </>
  );
}