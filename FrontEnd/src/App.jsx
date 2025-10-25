import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './Components/ProtectedRoute';
import FarmKartLanding from './Components/LandingPaage';
import AuthPage from './pages/AuthPage';
import Loader from './Components/common/Loader';

// Lazy load dashboards for better performance
const CustomerDashboard = lazy(() => import('./pages/dashboards/CustomerDashboard'));
const FarmerDashboard = lazy(() => import('./pages/dashboards/FarmerDashboard'));
const DeliveryDashboard = lazy(() => import('./pages/dashboards/DeliveryDashboard'));
const LargeScaleDashboard = lazy(() => import('./pages/delivery/LargeScaleDashboard'));
const SmallScaleDashboard = lazy(() => import('./pages/delivery/SmallScaleDashboard'));
const ProductCatalog = lazy(() => import('./pages/customer/ProductCatalog'));
const CartPage = lazy(() => import('./pages/customer/Cart'));
const OrderHistory = lazy(() => import('./pages/orders/OrderHistory'));
const RestaurantDashboard = lazy(() => import('./pages/dashboards/RestaurantDashboard'));
const BusinessDashboard = lazy(() => import('./pages/dashboards/BusinessDashboard'));
const AdminDashboard = lazy(() => import('./pages/dashboards/AdminDashboard'));
const CommunityDashboard = lazy(() => import('./pages/dashboards/CommunityDashboard'));

function App() {
  return (
    <Suspense fallback={<Loader fullScreen message="Loading..." />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<FarmKartLanding />} />
        <Route path="/shop" element={<ProductCatalog />} />
        <Route path="/cart" element={<CartPage />} />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={["customer","business","restaurant"]}>
              <OrderHistory />
            </ProtectedRoute>
          }
        />
        {/* Use your existing tabbed Login/Signup UI for both routes */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />

        {/* Shared layout with navbar/footer and nested dashboards */}
        <Route element={<DashboardLayout />}>        
          {/* Canonical top-level dashboard routes */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRoles={["customer"]}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/farmer"
            element={
              <ProtectedRoute allowedRoles={["farmer"]}>
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/business"
            element={
              <ProtectedRoute allowedRoles={["business"]}>
                <BusinessDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/restaurant"
            element={
              <ProtectedRoute allowedRoles={["restaurant"]}>
                <RestaurantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-large"
            element={
              <ProtectedRoute allowedRoles={["delivery_large"]}>
                <LargeScaleDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-small"
            element={
              <ProtectedRoute allowedRoles={["delivery_small"]}>
                <SmallScaleDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Legacy dashboard routes kept for compatibility */}
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
            path="/dashboard/delivery"
            element={
              <ProtectedRoute allowedRoles={["delivery","delivery_large","delivery_small"]}>
                <DeliveryDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/restaurant"
            element={
              <ProtectedRoute allowedRoles={["restaurant"]}>
                <RestaurantDashboard />
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
          <Route
            path="/dashboard/community"
            element={
              <ProtectedRoute allowedRoles={["community", "customer"]}>
                <CommunityDashboard />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
