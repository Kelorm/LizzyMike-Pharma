import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SalesContextProvider from './contexts/SalesContext';
import { MedicationProvider } from './contexts/MedicationContext';
import CustomerContextProvider from './contexts/CustomerContext';
import StockContextProvider from './contexts/StockContext';
import { GlobalSearchProvider } from './contexts/GlobalSearchContext';
import PharmacySystem from './components/PharmacySystem';
import CustomerModalDemo from './components/CustomerModalDemo';

// Wrapper component to handle sales data
const DashboardWrapper: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lowStockCount: number;
  pendingPrescriptions: number;
  notifications: any[];
  totalStockValue: number;
  notificationCount: number;
  onSearch: (query: string) => void;
  setLowStockCount: (count: number) => void;
  setPendingPrescriptions: (count: number) => void;
  setTotalStockValue: (value: number) => void;
  setNotificationCount: (count: number) => void;
}> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  pendingPrescriptions,
  notifications,
  totalStockValue,
  notificationCount,
  onSearch,
  setLowStockCount,
  setPendingPrescriptions,
  setTotalStockValue,
  setNotificationCount
}) => {
  const [sales, setSales] = useState<any[]>([]);

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      lowStockCount={lowStockCount}
      pendingPrescriptions={pendingPrescriptions}
      notifications={notifications}
      totalStockValue={totalStockValue}
      sales={sales}
      notificationCount={notificationCount}
      onSearch={onSearch}
    >
                                    <PharmacySystem
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                setLowStockCount={setLowStockCount}
                                setPendingPrescriptions={setPendingPrescriptions}
                                setTotalStockValue={setTotalStockValue}
                                setNotificationCount={setNotificationCount}
                                onSalesUpdate={setSales}
                              />
    </DashboardLayout>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingPrescriptions, setPendingPrescriptions] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (query: string) => {
    setSearchTerm(query);
    console.log('Search query:', query);
  };

  return (
    <AuthProvider>
      <GlobalSearchProvider>
        <MedicationProvider>
          <SalesContextProvider>
            <CustomerContextProvider>
              <StockContextProvider>
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
                        success: {
                          duration: 3000,
                          iconTheme: {
                            primary: '#4ade80',
                            secondary: '#fff',
                          },
                        },
                        error: {
                          duration: 5000,
                          iconTheme: {
                            primary: '#ef4444',
                            secondary: '#fff',
                          },
                        },
                      }}
                    />

                    <Routes>
                      <Route path="/login" element={<Login />} />
                      <Route path="/customer-demo" element={<CustomerModalDemo />} />
                      <Route
                        path="/*"
                        element={
                          <ProtectedRoute requiredPermission="view_dashboard">
                            <DashboardWrapper
                              activeTab={activeTab}
                              setActiveTab={setActiveTab}
                              lowStockCount={lowStockCount}
                              pendingPrescriptions={pendingPrescriptions}
                              notifications={notifications}
                              totalStockValue={totalStockValue}
                              notificationCount={notificationCount}
                              onSearch={handleSearch}
                              setLowStockCount={setLowStockCount}
                              setPendingPrescriptions={setPendingPrescriptions}
                              setTotalStockValue={setTotalStockValue}
                              setNotificationCount={setNotificationCount}
                            />
                          </ProtectedRoute>
                        }
                      />
                    </Routes>
                  </div>
                </BrowserRouter>
              </StockContextProvider>
            </CustomerContextProvider>
          </SalesContextProvider>
        </MedicationProvider>
      </GlobalSearchProvider>
    </AuthProvider>
  );
};

export default App;