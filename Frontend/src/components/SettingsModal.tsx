import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  User,
  Shield,
  Building,
  Bell,
  Save,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermissions } from '../hooks/usePermissions';
import UserAccountsPanel from './UserAccountsPanel';
import api from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: unknown) => void;
  initialTab?: 'account' | 'pharmacy' | 'notifications' | 'security';
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTab = 'account',
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'pharmacy' | 'notifications' | 'security'>(
    initialTab
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);

  const [pharmacyInfo, setPharmacyInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    license_no: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    enabled: true,
    lowStockAlerts: true,
    prescriptionAlerts: true,
    salesAlerts: false,
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { isAdmin, isPharmacist } = usePermissions();

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const loadPharmacy = useCallback(async () => {
    setPharmacyLoading(true);
    try {
      const res = await api.pharmacy.get();
      const d = res.data as {
        name?: string;
        address?: string;
        phone?: string;
        email?: string;
        license_no?: string;
      };
      setPharmacyInfo({
        name: d.name || '',
        address: d.address || '',
        phone: d.phone || '',
        email: d.email || '',
        license_no: d.license_no || '',
      });
    } catch {
      toast.error('Failed to load pharmacy details');
    } finally {
      setPharmacyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && (activeTab === 'pharmacy' || initialTab === 'pharmacy')) {
      loadPharmacy();
    }
  }, [isOpen, activeTab, initialTab, loadPharmacy]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'pharmacy') return;
    const onBranch = () => loadPharmacy();
    window.addEventListener('branch-changed', onBranch);
    return () => window.removeEventListener('branch-changed', onBranch);
  }, [isOpen, activeTab, loadPharmacy]);

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'pharmacy', label: 'Pharmacy', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ].filter((tab) => {
    if (tab.id === 'security' && !isAdmin) return false;
    if (tab.id === 'pharmacy' && !isAdmin && !isPharmacist) return false;
    return true;
  });

  const handleSavePharmacy = async () => {
    if (!pharmacyInfo.name.trim() || !pharmacyInfo.phone.trim()) {
      toast.error('Pharmacy name and phone number are required');
      return;
    }
    setLoading(true);
    try {
      await api.pharmacy.update({
        name: pharmacyInfo.name.trim(),
        phone: pharmacyInfo.phone.trim(),
        email: pharmacyInfo.email.trim(),
        license_no: pharmacyInfo.license_no.trim(),
        address: pharmacyInfo.address.trim(),
      });
      toast.success('Pharmacy details saved');
      onSave?.({ pharmacy: pharmacyInfo });
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg =
        typeof data?.detail === 'string'
          ? data.detail
          : data
            ? Object.values(data).flat().join(' ')
            : 'Failed to save pharmacy details';
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Enter current and new password');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await api.users.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      const msg =
        typeof data?.detail === 'string'
          ? data.detail
          : data?.current_password
            ? String(
                Array.isArray(data.current_password)
                  ? data.current_password[0]
                  : data.current_password
              )
            : data?.new_password
              ? String(Array.isArray(data.new_password) ? data.new_password[0] : data.new_password)
              : 'Failed to change password';
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (activeTab === 'pharmacy') {
      await handleSavePharmacy();
      return;
    }
    if (activeTab === 'security') {
      await handleChangePassword();
      return;
    }
    if (activeTab === 'notifications') {
      toast.success('Notification preferences saved locally');
      onSave?.({ notifications: notificationSettings });
      return;
    }
  };

  if (!isOpen) return null;

  const showSaveButton =
    activeTab === 'pharmacy' ||
    activeTab === 'security' ||
    activeTab === 'notifications' ||
    (activeTab === 'account' && !isAdmin);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'account' &&
              (isAdmin ? (
                <UserAccountsPanel />
              ) : (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
                  <p className="text-sm text-gray-600">
                    Ask an administrator to update your account details. You can change your password
                    from Security if available.
                  </p>
                </div>
              ))}

            {activeTab === 'pharmacy' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Pharmacy Information</h3>
                {pharmacyLoading ? (
                  <p className="text-sm text-gray-500">Loading…</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pharmacy Name *
                      </label>
                      <input
                        type="text"
                        value={pharmacyInfo.name}
                        onChange={(e) =>
                          setPharmacyInfo((prev) => ({ ...prev, name: e.target.value }))
                        }
                        disabled={!isAdmin}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={pharmacyInfo.phone}
                        onChange={(e) =>
                          setPharmacyInfo((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        disabled={!isAdmin}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={pharmacyInfo.email}
                        onChange={(e) =>
                          setPharmacyInfo((prev) => ({ ...prev, email: e.target.value }))
                        }
                        disabled={!isAdmin}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License No.
                      </label>
                      <input
                        type="text"
                        value={pharmacyInfo.license_no}
                        onChange={(e) =>
                          setPharmacyInfo((prev) => ({ ...prev, license_no: e.target.value }))
                        }
                        disabled={!isAdmin}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <textarea
                        value={pharmacyInfo.address}
                        onChange={(e) =>
                          setPharmacyInfo((prev) => ({ ...prev, address: e.target.value }))
                        }
                        disabled={!isAdmin}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
                      />
                    </div>
                    {!isAdmin && (
                      <p className="md:col-span-2 text-sm text-amber-700">
                        Only administrators can edit pharmacy details.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">Enable Notifications</h4>
                      <p className="text-sm text-gray-600">Receive system notifications</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationSettings.enabled}
                        onChange={(e) =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            enabled: e.target.checked,
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && isAdmin && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
                <p className="text-sm text-gray-600">
                  Update the password for your admin account. You must enter your current password.
                </p>
                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {activeTab === 'account' && isAdmin
              ? 'User changes apply immediately'
              : activeTab === 'security'
                ? 'Password change applies immediately'
                : '* Required fields'}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {activeTab === 'account' && isAdmin ? 'Close' : 'Cancel'}
            </button>
            {showSaveButton && !(activeTab === 'pharmacy' && !isAdmin) && (
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>
                  {activeTab === 'security'
                    ? loading
                      ? 'Updating…'
                      : 'Update Password'
                    : loading
                      ? 'Saving…'
                      : 'Save Settings'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
