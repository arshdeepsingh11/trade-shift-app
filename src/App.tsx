import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import EmployerSignup from './pages/auth/EmployerSignup';
import EmployeeSignup from './pages/auth/EmployeeSignup';
import ForgotPassword from './pages/auth/ForgotPassword';
import EmployerDashboard from './pages/employer/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup/employer" element={<EmployerSignup />} />
          <Route path="/signup/employee" element={<EmployeeSignup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route
            path="/employer/*"
            element={
              <ProtectedRoute allowedRoles={['employer']}>
                <EmployerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee/*"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;