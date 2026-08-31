import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BranchProvider } from './contexts/BranchContext';
import ProtectedRoute from './components/ProtectedRoute';
import SalesContextProvider from './contexts/SalesContext';
import { MedicationProvider } from './contexts/MedicationContext';
import CustomerContextProvider from './contexts/CustomerContext';
import { GlobalSearchProvider } from './contexts/GlobalSearchContext';
import { LayoutMetricsProvider, useLayoutMetrics } from './contexts/LayoutMetricsContext';
import PharmacySystem from './components/PharmacySystem';
import AuditTrailPage from './pages/AuditTrail';
import StockMovementsPage from './pages/StockMovements';
import { getHomePathForRole } from './utils/permissions';

const pathToTab = (pathname: string): string => {
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/prescription')) return 'prescription';
  if (pathname.startsWith('/customers')) return 'customers';
  if (pathname.startsWith('/sales-transactions')) return 'sales-transactions';
  if (pathname.startsWith('/pos')) return 'pos';
  if (pathname.startsWith('/sales')) return 'sales';
  if (pathname.startsWith('/settings')) return 'settings';
  if (pathname.startsWith('/restock')) return 'restock';
  if (pathname.startsWith('/audit')) return 'audit';
  if (pathname.startsWith('/stock-movements')) return 'stock-movements';
  return 'dashboard';
};

const AppShell: React.FC = () => {
  const location = useLocation();
  const activeTab = pathToTab(location.pathname);
  const {
    lowStockCount,
    pendingPrescriptions,
    notificationCount,
    totalStockValue,
    sales,
    notifications,
  } = useLayoutMetrics();

  return (
    <DashboardLayout
      activeTab={activeTab}
      lowStockCount={lowStockCount}
      pendingPrescriptions={pendingPrescriptions}
      notifications={notifications}
      totalStockValue={totalStockValue}
      sales={sales}
      notificationCount={notificationCount}
    >
      <Outlet />
    </DashboardLayout>
  );
};

/** Authenticated shell with baseline permission; per-route gates nest inside. */
const AuthenticatedShell: React.FC = () => (
  <ProtectedRoute requiredPermission="view_dashboard">
    <AppShell />
  </ProtectedRoute>
);

const RoleHomeRedirect: React.FC = () => {
  const { user } = useAuth();
  return <Navigate to={getHomePathForRole(user?.role)} replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BranchProvider>
      <GlobalSearchProvider>
        <MedicationProvider>
          <SalesContextProvider>
            <CustomerContextProvider>
              <LayoutMetricsProvider>
                <BrowserRouter>
                  <div className="App">
                    <Toaster
                      position="top-right"
                      toastOptions={{
                        duration: 4000,
                        style: {
                          background: '#363636',
                          color: '#fff',
                          borderRadius: '8px',
                        },
                      }}
                    />
                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route element={<AuthenticatedShell />}>
                        <Route
                          path="/"
                          element={
                            <ProtectedRoute requiredPermission="view_dashboard">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/inventory"
                          element={
                            <ProtectedRoute requiredPermission="view_inventory">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/prescription"
                          element={
                            <ProtectedRoute requiredPermission="view_prescriptions">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/customers"
                          element={
                            <ProtectedRoute requiredPermission="view_customers">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/pos"
                          element={
                            <ProtectedRoute requiredPermission="create_sale">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/sales"
                          element={
                            <ProtectedRoute requiredPermission="view_analytics">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/sales-transactions"
                          element={
                            <ProtectedRoute requiredPermission="view_sales_transactions">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/restock"
                          element={
                            <ProtectedRoute requiredPermission="view_restock">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/settings"
                          element={
                            <ProtectedRoute requiredPermission="view_settings">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/branches"
                          element={
                            <ProtectedRoute requiredRole="admin">
                              <PharmacySystem />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/audit"
                          element={
                            <ProtectedRoute requiredRole="admin">
                              <AuditTrailPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/stock-movements"
                          element={
                            <ProtectedRoute requiredPermission="view_restock">
                              <StockMovementsPage />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<RoleHomeRedirect />} />
                      </Route>
                    </Routes>
                  </div>
                </BrowserRouter>
              </LayoutMetricsProvider>
            </CustomerContextProvider>
          </SalesContextProvider>
        </MedicationProvider>
      </GlobalSearchProvider>
      </BranchProvider>
    </AuthProvider>
  );
};

export default App;
