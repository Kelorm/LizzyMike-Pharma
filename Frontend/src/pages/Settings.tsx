//src/pages/Settings.tsx

import React, { useState, ReactNode } from 'react';
import { Settings as SettingsIcon, Package, Bell, CalendarDays, Percent } from 'lucide-react';
import SettingsModal from '../components/SettingsModal';
import BusinessDayPanel from '../components/BusinessDayPanel';
import TaxDiscountSettingsPanel from '../components/TaxDiscountSettingsPanel';
import { useUserManagementPermissions } from '../hooks/usePermissions';
import { usePermissions } from '../hooks/usePermissions';

type SettingsCardProps = {
  title: string;
  icon: ReactNode;
  items?: { title: string; description: string; onClick: () => void }[];
  children?: ReactNode;
};

const SettingsCard: React.FC<SettingsCardProps> = ({ title, icon, items, children }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center mb-4">
      {icon}
      <h3 className="ml-2 text-lg font-semibold">{title}</h3>
    </div>
    {items && (
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="flex flex-col cursor-pointer hover:bg-gray-50 p-2 rounded" onClick={item.onClick}>
            <span className="font-medium">{item.title}</span>
            <span className="text-sm text-gray-500">{item.description}</span>
          </li>
        ))}
      </ul>
    )}
    {children}
  </div>
);

const ToggleSetting: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => (
  <label className="flex items-center space-x-2 my-2">
    <input
      type="checkbox"
      checked={checked}
      onChange={e => onChange(e.target.checked)}
      disabled={disabled}
      className="form-checkbox"
    />
    <span className={disabled ? "text-gray-400" : ""}>{label}</span>
  </label>
);

const Settings: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'pharmacy' | 'notifications' | 'security'>('account');
  const { canViewUsers } = useUserManagementPermissions();
  const { isAdmin } = usePermissions();

  const handleOpenSettingsModal = (tab: 'account' | 'pharmacy' | 'notifications' | 'security') => {
    setActiveTab(tab);
    setShowSettingsModal(true);
  };

  const handleCloseSettingsModal = () => {
    setShowSettingsModal(false);
  };

  const handleSaveSettings = (settings: any) => {
    console.log('Settings saved:', settings);
  };

  const accountItems = [
    ...(canViewUsers
      ? [
          {
            title: 'User Accounts',
            description: 'Create staff accounts and allow or disallow access',
            onClick: () => handleOpenSettingsModal('account'),
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: 'Password & Security',
            description: 'Update your login credentials',
            onClick: () => handleOpenSettingsModal('security'),
          },
        ]
      : [
          {
            title: 'My Account',
            description: 'View profile and password options',
            onClick: () => handleOpenSettingsModal('account'),
          },
        ]),
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SettingsCard 
          title="Account Settings"
          icon={<SettingsIcon className="h-5 w-5 text-blue-500" />}
          items={accountItems}
        />
        
        <SettingsCard 
          title="Pharmacy Configuration"
          icon={<Package className="h-5 w-5 text-green-500" />}
          items={[
            {
              title: "Business Information",
              description: "Update pharmacy details",
              onClick: () => handleOpenSettingsModal('pharmacy')
            },
            {
              title: "Notification Settings",
              description: "Configure alerts and notifications",
              onClick: () => handleOpenSettingsModal('notifications')
            }
          ]}
        />
      </div>

      {isAdmin && (
        <SettingsCard
          title="Tax & Discount"
          icon={<Percent className="h-5 w-5 text-emerald-700" />}
        >
          <TaxDiscountSettingsPanel />
        </SettingsCard>
      )}

      {isAdmin && (
        <SettingsCard
          title="Trading Day"
          icon={<CalendarDays className="h-5 w-5 text-blue-600" />}
        >
          <BusinessDayPanel />
        </SettingsCard>
      )}
      
      <SettingsCard 
        title="Notifications"
        icon={<Bell className="h-5 w-5 text-yellow-500" />}
      >
        <ToggleSetting
          label="Enable Notifications"
          checked={notificationsEnabled}
          onChange={setNotificationsEnabled}
        />
        <ToggleSetting
          label="Low Stock Alerts"
          checked={lowStockAlerts}
          onChange={setLowStockAlerts}
          disabled={!notificationsEnabled}
        />
      </SettingsCard>

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={handleCloseSettingsModal}
        onSave={handleSaveSettings}
        initialTab={activeTab}
      />
    </div>
  );
};

export default Settings;
