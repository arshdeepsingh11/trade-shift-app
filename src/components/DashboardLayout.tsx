import { type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import '../styles/dashboard.css';

interface NavItem {
  label: string;
  to: string;
}

interface DashboardLayoutProps {
  logoText: string;
  navItems: NavItem[];
  children: ReactNode;
}

export function DashboardLayout({ logoText, navItems, children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-logo">{logoText}</div>

        <nav className="dashboard-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split('/').length <= 2}
              className={({ isActive }) =>
                isActive ? 'dashboard-nav-link active' : 'dashboard-nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          {profile && (
            <div className="dashboard-user">
              <strong>{profile.full_name}</strong>
              {profile.email}
            </div>
          )}
          <button className="dashboard-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="dashboard-main">{children}</main>
    </div>
  );
}