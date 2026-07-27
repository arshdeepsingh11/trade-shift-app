import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import AdminOverview from './Overview';
import Companies from './Companies';
import CompanyDetail from './CompanyDetail';
import PlatformEmployees from './PlatformEmployees';
import AuditLog from './AuditLog';

const navItems = [
  { label: 'Overview', to: '/admin' },
  { label: 'Companies', to: '/admin/companies' },
  { label: 'All Employees', to: '/admin/employees' },
  { label: 'Audit Log', to: '/admin/audit-log' },
];

export default function AdminDashboard() {
  return (
    <DashboardLayout logoText="Super Admin" navItems={navItems}>
      <Routes>
        <Route path="/" element={<AdminOverview />} />
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:employerId" element={<CompanyDetail />} />
        <Route path="employees" element={<PlatformEmployees />} />
        <Route path="audit-log" element={<AuditLog />} />
      </Routes>
    </DashboardLayout>
  );
}