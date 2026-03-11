import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalSearch } from '../contexts/GlobalSearchContext';
import { usePermissions } from '../hooks/usePermissions';
import GlobalSearchModal from './GlobalSearchModal';
import LizzyMikeLogo from '../assets/LizzyMikeLogo.png';

interface Notification {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'critical';
  date: string;
  read: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'pharmacist' | 'staff';
  full_name: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lowStockCount: number;
  pendingPrescriptions: number;
  notifications: Notification[];
  totalStockValue: number;
  sales: any[]; // Add sales prop
  notificationCount: number;
  onSearch: (query: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  lowStockCount,
  pendingPrescriptions,
  notifications,
  totalStockValue,
  sales,
  notificationCount,
  onSearch
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const { user, logout } = useAuth();
  const { performGlobalSearch } = useGlobalSearch();
  const { navPermissions } = usePermissions();
  const location = useLocation();

  // Calculate Today's Revenue using the same logic as Dashboard
  const todaysRevenue = useMemo(() => {
    const todaysSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      const today = new Date();
      
      // Reset time to compare only dates
      const saleDateOnly = new Date(saleDate.getFullYear(), saleDate.getMonth(), saleDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return saleDateOnly.getTime() === todayOnly.getTime();
    });
    
    return todaysSales.reduce((sum, sale) => {
      const total = Number(sale.total) || 0;
      return sum + total;
    }, 0);
  }, [sales]);

  const handleGlobalSearchClick = () => {
    setShowGlobalSearch(true);
  };

  // Keyboard shortcut for global search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setShowGlobalSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'dashboard', permission: 'dashboard' },
    { id: 'inventory', label: 'Inventory', path: '/inventory', icon: 'inventory', permission: 'inventory' },
    { id: 'prescription', label: 'Prescriptions', path: '/prescription', icon: 'prescription', permission: 'prescriptions' },
    { id: 'customers', label: 'Customers', path: '/customers', icon: 'customers', permission: 'customers' },
    { id: 'sales', label: 'Sales', path: '/sales', icon: 'sales', permission: 'sales' },
    { id: 'sales-transactions', label: 'Transactions', path: '/sales-transactions', icon: 'transactions', permission: 'sales' },
    { id: 'settings', label: 'Settings', path: '/settings', icon: 'settings', permission: 'settings' },
  ].filter(item => navPermissions[item.permission as keyof typeof navPermissions]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'dashboard':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'inventory':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'prescription':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'customers':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'sales':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'transactions':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-sm z-30 fixed top-0 left-0 w-full">
        <div className="w-full">
          <div className="flex justify-between h-16 items-center px-3 sm:px-4">
            {/* Logo and Mobile Menu Button */}
            <div className="flex items-center flex-shrink-0">
              <img src={LizzyMikeLogo} alt="LizzyMike Pharmacy Logo" className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded pr-2 sm:pr-4" />
              <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-blue-600 hidden sm:block">
                LizzyMike Pharmacy
              </span>
              <button
                type="button"
                className="sm:hidden bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 ml-2"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                <span className="sr-only">Open main menu</span>
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            {/* Search Bar - Desktop */}
            <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden md:block">
              <button
                onClick={handleGlobalSearchClick}
                className="block w-full pl-10 pr-20 py-2 rounded-md border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-left relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-500">Search across system...</span>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
                  </kbd>
                </div>
              </button>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative p-2"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <span className="sr-only">View notifications</span>
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notificationCount}
                    </span>
                  )}
                </button>
              </div>
              
              {/* Profile Dropdown */}
              <div className="relative">
                <div>
                  <button
                    type="button"
                    className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                  >
                    <div className="bg-blue-500 text-white rounded-full h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center text-sm sm:text-base">
                      {user?.full_name?.[0] || 'U'}
                    </div>
                    <div className="ml-2 sm:ml-3 text-right hidden lg:block">
                      <div className="font-medium text-gray-800">
                        {user?.full_name}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {user?.role || 'User'}
                      </div>
                    </div>
                  </button>
                </div>
                
                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <button
                      onClick={logout}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Vertical Sidebar */}
        <div className="hidden lg:block bg-white w-64 min-h-screen border-r border-gray-200 flex-col fixed top-16 left-0 z-20">
          <div className="p-4 flex-grow">
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`${
                    location.pathname === item.path
                      ? 'bg-blue-50 text-blue-700 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-3 py-2 text-sm font-medium rounded-md border-l-4 transition-colors`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="text-blue-500 mr-3">
                    {getIcon(item.icon)}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          
          {/* QUICK STATS SECTION IN SIDEBAR */}
          <div className="p-4 bg-blue-50 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Stats</h2>
            <div className="space-y-2">
              {/* Total Stock Value */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total Stock Value</span>
                <span className="text-sm font-semibold text-gray-800">
                  GHS {totalStockValue.toFixed(2)}
                </span>
              </div>
              {/* Pending Orders */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Pending Orders</span>
                <span className="text-sm font-semibold text-orange-600">
                  {pendingPrescriptions}
                </span>
              </div>
              {/* Low Stock Items */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Low Stock Items</span>
                <span className="text-sm font-semibold text-red-600">
                  {lowStockCount}
                </span>
              </div>
              {/* Today's Revenue */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Today's Revenue</span>
                <span className="text-sm font-semibold text-green-600">
                  GHS {todaysRevenue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}></div>
            <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center">
                  <img src={LizzyMikeLogo} alt="Logo" className="h-8 w-8 object-contain mr-3" />
                  <span className="text-lg font-bold text-blue-600">Menu</span>
                </div>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-4">
                <nav className="space-y-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`${
                        location.pathname === item.path
                          ? 'bg-blue-50 text-blue-700 border-blue-500'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-3 py-3 text-sm font-medium rounded-md border-l-4 transition-colors`}
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMobileMenu(false);
                      }}
                    >
                      <span className="text-blue-500 mr-3">
                        {getIcon(item.icon)}
                      </span>
                      {item.label}
                    </Link>
                  ))}
                </nav>
                
                {/* Mobile Quick Stats */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Stats</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-2 rounded">
                      <div className="text-gray-500">Stock Value</div>
                      <div className="font-semibold text-gray-800">GHS {totalStockValue.toFixed(2)}</div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="text-gray-500">Pending</div>
                      <div className="font-semibold text-orange-600">{pendingPrescriptions}</div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="text-gray-500">Low Stock</div>
                      <div className="font-semibold text-red-600">{lowStockCount}</div>
                    </div>
                    <div className="bg-white p-2 rounded">
                      <div className="text-gray-500">Today's Revenue</div>
                      <div className="font-semibold text-green-600">GHS {todaysRevenue.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 bg-gray-100 lg:ml-64 pt-16">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
            {/* Search Bar - Mobile */}
            <div className="lg:hidden mb-4">
              <button
                onClick={handleGlobalSearchClick}
                className="block w-full pl-10 pr-20 py-3 rounded-lg border border-gray-300 leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-left relative shadow-sm"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-500">Search across system...</span>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K
                  </kbd>
                </div>
              </button>
            </div>
            
            {/* Main content area */}
            {children}
          </div>
        </main>
      </div>
      
      {/* Global Search Modal */}
      <GlobalSearchModal 
        isOpen={showGlobalSearch} 
        onClose={() => setShowGlobalSearch(false)} 
      />
    </div>
  );
};

export default DashboardLayout;