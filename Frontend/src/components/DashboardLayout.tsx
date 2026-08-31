import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import { useLayoutMetrics } from '../contexts/LayoutMetricsContext';
import { usePermissions } from '../hooks/usePermissions';
import GlobalSearchModal from './GlobalSearchModal';
import LizzyMikeLogo from '../assets/LizzyMikeLogo.png';
import { Notification } from '../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  lowStockCount: number;
  pendingPrescriptions: number;
  notifications: Notification[];
  totalStockValue: number;
  sales: Array<{ date: string; total: number | string }>;
  notificationCount: number;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab: _activeTab,
  lowStockCount,
  pendingPrescriptions,
  notifications,
  totalStockValue,
  sales,
  notificationCount,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const { user, logout } = useAuth();
  const { branches, activeBranch, setActiveBranchId } = useBranch();
  const { markNotificationRead, markAllNotificationsRead } = useLayoutMetrics();
  const { navPermissions } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const notificationTone = (type: Notification['type']) => {
    if (type === 'low_stock' || type === 'expiry') return 'text-amber-700 bg-amber-50';
    if (type === 'prescription') return 'text-blue-700 bg-blue-50';
    return 'text-gray-700 bg-gray-50';
  };

  const notificationLabel = (type: Notification['type']) => {
    if (type === 'low_stock') return 'Low stock';
    if (type === 'expiry') return 'Expiry';
    if (type === 'prescription') return 'Prescription';
    return 'System';
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'dashboard', permission: 'dashboard' },
    { id: 'inventory', label: 'Inventory', path: '/inventory', icon: 'inventory', permission: 'inventory' },
    { id: 'prescription', label: 'Prescriptions', path: '/prescription', icon: 'prescription', permission: 'prescriptions' },
    { id: 'customers', label: 'Customers', path: '/customers', icon: 'customers', permission: 'customers' },
    { id: 'pos', label: 'POS', path: '/pos', icon: 'sales', permission: 'sales' },
    { id: 'sales', label: 'Sales', path: '/sales', icon: 'sales', permission: 'analytics' },
    { id: 'sales-transactions', label: 'Transactions', path: '/sales-transactions', icon: 'transactions', permission: 'sales' },
    { id: 'restock', label: 'Restock', path: '/restock', icon: 'inventory', permission: 'restock' },
    { id: 'stock-movements', label: 'Stock Ledger', path: '/stock-movements', icon: 'inventory', permission: 'stockMovements' },
    { id: 'branches', label: 'Branches', path: '/branches', icon: 'branches', permission: 'branches' },
    { id: 'audit', label: 'Audit', path: '/audit', icon: 'settings', permission: 'audit' },
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
      case 'branches':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
                  <span className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded">
                    Search
                  </span>
                </div>
              </button>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Branch switcher */}
              {activeBranch && (
                <div className="hidden sm:flex items-center gap-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Branch</label>
                  {branches.length > 1 ? (
                    <select
                      value={activeBranch.id}
                      onChange={(e) => setActiveBranchId(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white max-w-[10rem]"
                      title="Active pharmacy branch"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} — {b.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[10rem]">
                      {activeBranch.code}
                    </span>
                  )}
                </div>
              )}
              {/* Notifications */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 relative p-2"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowNotifications((open) => !open);
                  }}
                  aria-expanded={showNotifications}
                  aria-haspopup="true"
                >
                  <span className="sr-only">View notifications</span>
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="origin-top-right absolute right-0 mt-2 w-80 sm:w-96 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      {notifications.some((n) => !n.read) && (
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:text-blue-800"
                          onClick={() => markAllNotificationsRead()}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-gray-500">
                          No notifications right now
                        </div>
                      ) : (
                        notifications.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                              item.read ? 'opacity-70' : ''
                            }`}
                            onClick={() => {
                              markNotificationRead(item.id);
                              setShowNotifications(false);
                              if (item.href) {
                                navigate(item.href);
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${notificationTone(
                                  item.type
                                )}`}
                              >
                                {notificationLabel(item.type)}
                              </span>
                              {!item.read && (
                                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-800">{item.message}</p>
                          </button>
                        ))
                      )}
                    </div>
                    {(lowStockCount > 0 || pendingPrescriptions > 0) && (
                      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex gap-3 text-xs">
                        {lowStockCount > 0 && (
                          <Link
                            to="/inventory"
                            className="text-red-600 hover:underline"
                            onClick={() => setShowNotifications(false)}
                          >
                            {lowStockCount} low stock
                          </Link>
                        )}
                        {pendingPrescriptions > 0 && (
                          <Link
                            to="/prescription"
                            className="text-orange-600 hover:underline"
                            onClick={() => setShowNotifications(false)}
                          >
                            {pendingPrescriptions} pending Rx
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <div>
                  <button
                    type="button"
                    className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => {
                      setShowNotifications(false);
                      setShowProfileMenu((open) => !open);
                    }}
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
        {/* Vertical Sidebar — nav scrolls; quick stats pinned at bottom */}
        <aside className="hidden lg:flex lg:flex-col bg-white w-64 border-r border-gray-200 fixed top-16 left-0 z-20 h-[calc(100vh-4rem)]">
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
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
                >
                  <span className="text-blue-500 mr-3">
                    {getIcon(item.icon)}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Quick Stats — always visible at bottom of sidebar */}
          <div className="flex-shrink-0 p-4 bg-blue-50 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Quick Stats</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total Stock Value</span>
                <span className="text-sm font-semibold text-gray-800">
                  GHS {totalStockValue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Pending Orders</span>
                <span className="text-sm font-semibold text-orange-600">
                  {pendingPrescriptions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Low Stock Items</span>
                <span className="text-sm font-semibold text-red-600">
                  {lowStockCount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Today&apos;s Revenue</span>
                <span className="text-sm font-semibold text-green-600">
                  GHS {todaysRevenue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}></div>
            <div className="fixed left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
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

              <div className="flex-1 min-h-0 overflow-y-auto p-4">
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
              </div>

              {/* Mobile Quick Stats — pinned at bottom */}
              <div className="flex-shrink-0 p-4 bg-blue-50 border-t border-gray-200">
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
                    <div className="text-gray-500">Today&apos;s Revenue</div>
                    <div className="font-semibold text-green-600">GHS {todaysRevenue.toFixed(2)}</div>
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
                  <span className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded">
                    Search
                  </span>
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