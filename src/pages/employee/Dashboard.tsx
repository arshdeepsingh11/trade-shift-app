import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import EmployeeOverview from './Overview';
import EmployeeShifts from './Shifts';
import EmployeePay from './Pay';

const navItems = [
  { label: 'Overview', to: '/employee' },
  { label: 'Shifts', to: '/employee/shifts' },
  { label: 'Pay', to: '/employee/pay' },
];

export default function EmployeeDashboard() {
  return (
    <DashboardLayout logoText="Employee Panel" navItems={navItems}>
      <Routes>
        <Route path="/" element={<EmployeeOverview />} />
        <Route path="shifts" element={<EmployeeShifts />} />
        <Route path="pay" element={<EmployeePay />} />
      </Routes>
    </DashboardLayout>
  );
}