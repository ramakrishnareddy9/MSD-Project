import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './Components/ProtectedRoute';
import FarmKartLanding from './Components/LandingPaage';
import AuthPage from './pages/AuthPage';

// Dashboards
import CustomerDashboard from './pages/dashboards/CustomerDashboard';
import FarmerDashboard from './pages/dashboards/FarmerDashboard';
import TransporterDashboard from './pages/dashboards/TransporterDashboard';
import CommunityDashboard from './pages/dashboards/CommunityDashboard';
import BusinessDashboard from './pages/dashboards/BusinessDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<FarmKartLanding />} />
      {/* Use your existing tabbed Login/Signup UI for both routes */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />

      {/* Shared layout with navbar/footer and nested dashboards */}
      <Route element={<DashboardLayout />}>        
        <Route
          path="/dashboard/customer"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <FarmerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/transporter"
          element={
            <ProtectedRoute allowedRoles={["transporter"]}>
              <TransporterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/community"
          element={
            <ProtectedRoute allowedRoles={["community"]}>
              <CommunityDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/business"
          element={
            <ProtectedRoute allowedRoles={["business"]}>
              <BusinessDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
