import { useAuth } from '../../hooks/useAuth';

export default function EmployeeOverview() {
  const { profile } = useAuth();

  return (
    <>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Welcome{profile ? `, ${profile.full_name}` : ''}</h1>
        <p className="dashboard-subtitle">Here's what's coming up.</p>
      </div>

      <div className="dashboard-card">
        <p style={{ margin: 0, color: '#5b5d78', fontSize: 14 }}>
          Your next shift and recent activity will show here.
        </p>
      </div>
    </>
  );
}