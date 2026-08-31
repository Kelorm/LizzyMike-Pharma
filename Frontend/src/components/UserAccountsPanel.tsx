import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';
import { useUserManagementPermissions } from '../hooks/usePermissions';

type CreatableRole = 'staff' | 'pharmacist';

const emptyForm = {
  username: '',
  email: '',
  full_name: '',
  phone: '',
  password: '',
  role: 'staff' as CreatableRole,
  branch_ids: [] as string[],
};

type EditForm = {
  email: string;
  full_name: string;
  phone: string;
  role: CreatableRole | 'admin';
  password: string;
  branch_ids: string[];
};

function unwrapList(data: unknown): User[] {
  if (Array.isArray(data)) return data as User[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: User[] }).results)) {
    return (data as { results: User[] }).results;
  }
  return [];
}

function errMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  return Object.values(data).flat().join(' ') || fallback;
}

const UserAccountsPanel: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { branches } = useBranch();
  const { canViewUsers, canAddUser, canEditUser, canDeleteUser } = useUserManagementPermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    branch_ids: [] as string[],
  }));
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    email: '',
    full_name: '',
    phone: '',
    role: 'staff',
    password: '',
    branch_ids: [],
  });
  const [editSaving, setEditSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!canViewUsers) return;
    setLoading(true);
    try {
      const response = await api.users.list({ page_size: '100' });
      setUsers(unwrapList(response.data));
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [canViewUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (!canViewUsers) {
    return (
      <p className="text-sm text-gray-600">
        Only administrators can manage user accounts.
      </p>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddUser) return;
    if (!form.username || !form.email || !form.password || !form.full_name) {
      toast.error('Username, email, full name, and password are required');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      await api.users.register({
        username: form.username.trim(),
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
        branch_ids: form.branch_ids.length ? form.branch_ids : undefined,
      });
      toast.success('User created');
      setForm({ ...emptyForm, branch_ids: [] });
      await loadUsers();
    } catch (err: unknown) {
      toast.error(errMessage(err, 'Failed to create user'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (target: User) => {
    if (!canEditUser) return;
    if (currentUser?.id === target.id) {
      toast.error('You cannot deactivate your own account');
      return;
    }
    const next = !target.is_active;
    setTogglingId(target.id);
    try {
      await api.users.setActive(target.id, next);
      toast.success(next ? 'Account enabled' : 'Account disabled');
      await loadUsers();
    } catch (err: unknown) {
      toast.error(errMessage(err, 'Failed to update account'));
    } finally {
      setTogglingId(null);
    }
  };

  const openEdit = (target: User) => {
    if (!canEditUser) return;
    setEditing(target);
    setEditForm({
      email: target.email || '',
      full_name: target.full_name || '',
      phone: target.phone || '',
      role: (target.role as CreatableRole | 'admin') || 'staff',
      password: '',
      branch_ids: (target.branches || []).map((b) => b.id),
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !canEditUser) return;
    if (!editForm.email.trim() || !editForm.full_name.trim()) {
      toast.error('Full name and email are required');
      return;
    }
    if (editForm.password && editForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setEditSaving(true);
    try {
      const payload: Parameters<typeof api.users.update>[1] = {
        email: editForm.email.trim(),
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim(),
        branch_ids: editForm.branch_ids,
      };
      if (editing.role !== 'admin') {
        payload.role = editForm.role as CreatableRole;
      }
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await api.users.update(editing.id, payload);
      toast.success('User updated');
      setEditing(null);
      await loadUsers();
    } catch (err: unknown) {
      toast.error(errMessage(err, 'Failed to update user'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (target: User) => {
    if (!canDeleteUser) return;
    if (currentUser?.id === target.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (target.role === 'admin') {
      toast.error('Admin accounts cannot be deleted here');
      return;
    }
    if (
      !window.confirm(
        `Permanently delete user "${target.username}"? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.users.delete(target.id);
      toast.success('User deleted');
      if (editing?.id === target.id) setEditing(null);
      await loadUsers();
    } catch (err: unknown) {
      toast.error(errMessage(err, 'Failed to delete user'));
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">System users</h3>
        <p className="text-sm text-gray-600 mb-4">
          Create, edit, enable/disable, or delete staff and pharmacist accounts.
        </p>
        {loading ? (
          <p className="text-sm text-gray-500">Loading users…</p>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Username</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Role</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Branches</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  {(canEditUser || canDeleteUser) && (
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2 font-medium text-gray-900">{u.username}</td>
                    <td className="px-3 py-2 text-gray-700">{u.full_name || '—'}</td>
                    <td className="px-3 py-2 capitalize text-gray-700">{u.role}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      {u.role === 'admin'
                        ? 'All'
                        : (u.branches || []).map((b) => b.code).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.is_active !== false
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    {(canEditUser || canDeleteUser) && (
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {canEditUser && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEdit(u)}
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={togglingId === u.id || currentUser?.id === u.id}
                                onClick={() => handleToggleActive(u)}
                                className="text-amber-700 hover:text-amber-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                              >
                                {u.is_active !== false ? 'Disable' : 'Enable'}
                              </button>
                            </>
                          )}
                          {canDeleteUser && u.role !== 'admin' && currentUser?.id !== u.id && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              className="inline-flex items-center gap-1 text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <form onSubmit={handleSaveEdit} className="space-y-4 border border-blue-100 bg-blue-50/40 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit user: {editing.username}
            </h3>
            <button type="button" onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
              <input
                value={editForm.full_name}
                onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              {editing.role === 'admin' ? (
                <input
                  value="admin"
                  disabled
                  className="w-full border border-gray-200 bg-gray-100 rounded-lg px-3 py-2 text-gray-600"
                />
              ) : (
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value as CreatableRole }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="staff">Staff</option>
                  <option value="pharmacist">Pharmacist</option>
                </select>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New password (optional)
              </label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                autoComplete="new-password"
                placeholder="Leave blank to keep current password"
              />
            </div>
            {editing.role !== 'admin' && branches.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Branches</label>
                <div className="flex flex-wrap gap-3">
                  {branches.map((b) => (
                    <label key={b.id} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editForm.branch_ids.includes(b.id)}
                        onChange={(e) => {
                          setEditForm((f) => ({
                            ...f,
                            branch_ids: e.target.checked
                              ? [...f.branch_ids, b.id]
                              : f.branch_ids.filter((id) => id !== b.id),
                          }));
                        }}
                      />
                      {b.code} — {b.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={editSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editSaving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {canAddUser && (
        <form onSubmit={handleCreate} className="space-y-4 border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Create account</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
              <input
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as CreatableRole }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="staff">Staff</option>
                <option value="pharmacist">Pharmacist</option>
              </select>
            </div>
            {branches.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branches (optional — defaults to HQ)
                </label>
                <div className="flex flex-wrap gap-3">
                  {branches.map((b) => (
                    <label key={b.id} className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.branch_ids.includes(b.id)}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            branch_ids: e.target.checked
                              ? [...f.branch_ids, b.id]
                              : f.branch_ids.filter((id) => id !== b.id),
                          }));
                        }}
                      />
                      {b.code} — {b.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create user'}
          </button>
        </form>
      )}
    </div>
  );
};

export default UserAccountsPanel;
