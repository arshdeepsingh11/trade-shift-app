import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import EmployerOverview from './Overview';
import Sites from './Sites';
import Employees from './Employees';
import Shifts from './Shifts';
import Pay from './Pay';

const navItems = [
  { label: 'Overview', to: '/employer' },
  { label: 'Sites', to: '/employer/sites' },
  { label: 'Employees', to: '/employer/employees' },
  { label: 'Shifts', to: '/employer/shifts' },
  { label: 'Pay', to: '/employer/pay' },
];

export default function EmployerDashboard() {
  return (
    <DashboardLayout logoText="Employer Panel" navItems={navItems}>
      <Routes>
        <Route path="/" element={<EmployerOverview />} />
        <Route path="sites" element={<Sites />} />
        <Route path="employees" element={<Employees />} />
        <Route path="shifts" element={<Shifts />} />
        <Route path="pay" element={<Pay />} />
      </Routes>
    </DashboardLayout>
  );
}