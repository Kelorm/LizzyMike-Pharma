import React, { createContext, useContext, useState } from 'react';
import { Notification } from '../types';

interface LayoutMetrics {
  lowStockCount: number;
  pendingPrescriptions: number;
  notificationCount: number;
  totalStockValue: number;
  sales: Array<{ date: string; total: number | string }>;
  notifications: Notification[];
  setLowStockCount: (n: number) => void;
  setPendingPrescriptions: (n: number) => void;
  setNotificationCount: (n: number) => void;
  setTotalStockValue: (n: number) => void;
  setSales: (sales: Array<{ date: string; total: number | string }>) => void;
  setNotifications: (items: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const LayoutMetricsContext = createContext<LayoutMetrics | null>(null);

export const LayoutMetricsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lowStockCount, setLowStockCount] = useState(0);
  const [pendingPrescriptions, setPendingPrescriptions] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [totalStockValue, setTotalStockValue] = useState(0);
  const [sales, setSales] = useState<Array<{ date: string; total: number | string }>>([]);
  const [notifications, setNotificationsState] = useState<Notification[]>([]);

  const setNotifications = (items: Notification[]) => {
    setNotificationsState(items);
    setNotificationCount(items.filter((n) => !n.read).length);
  };

  const markNotificationRead = (id: string) => {
    setNotificationsState((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      setNotificationCount(next.filter((n) => !n.read).length);
      return next;
    });
  };

  const markAllNotificationsRead = () => {
    setNotificationsState((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      setNotificationCount(0);
      return next;
    });
  };

  const value: LayoutMetrics = {
    lowStockCount,
    pendingPrescriptions,
    notificationCount,
    totalStockValue,
    sales,
    notifications,
    setLowStockCount,
    setPendingPrescriptions,
    setNotificationCount,
    setTotalStockValue,
    setSales,
    setNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  };

  return (
    <LayoutMetricsContext.Provider value={value}>
      {children}
    </LayoutMetricsContext.Provider>
  );
};

export const useLayoutMetrics = (): LayoutMetrics => {
  const ctx = useContext(LayoutMetricsContext);
  if (!ctx) {
    throw new Error('useLayoutMetrics must be used within LayoutMetricsProvider');
  }
  return ctx;
};
