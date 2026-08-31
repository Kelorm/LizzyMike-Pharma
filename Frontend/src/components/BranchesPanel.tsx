import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useBranch, BranchInfo } from '../contexts/BranchContext';

const BranchesPanel: React.FC = () => {
  const { branches, refreshBranches, setActiveBranchId, activeBranch } = useBranch();
  const [rows, setRows] = useState<BranchInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    name: '',
    phone: '',
    address: '',
  });

  const reload = async () => {
    setLoading(true);
    try {
      const res = await api.branch.list();
      const data = res.data?.results ?? res.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      await refreshBranches();
    } catch {
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    setSaving(true);
    try {
      await api.branch.create({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        is_active: true,
      });
      toast.success('Branch created');
      setForm({
        code: '',
        name: '',
        phone: '',
        address: '',
      });
      await reload();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (typeof data?.detail === 'string') {
        toast.error(data.detail);
      } else if (data && typeof data === 'object') {
        const first = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
          .join('; ');
        toast.error(first || 'Could not create branch');
      } else {
        toast.error('Could not create branch');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (branch: BranchInfo) => {
    try {
      await api.branch.update(branch.id, { is_active: !branch.is_active });
      toast.success(branch.is_active ? 'Branch deactivated' : 'Branch activated');
      await reload();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Pharmacy locations</h3>
        <p className="text-sm text-gray-600">
          Create and manage branches. Inventory, sales, and trading days are per branch.
          Configure sales tax under Settings → Sales Tax for the active branch.
        </p>
      </div>

      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-gray-200 rounded-lg p-4">
        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Code (e.g. EAST)"
          value={form.code}
          onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
        />
        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Branch name"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
        />
        <input
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          placeholder="Address"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        />
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md disabled:opacity-60"
          >
            {saving ? 'Creating…' : 'Add branch'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading branches…</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows.length ? rows : branches).map((b) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono">{b.code}</td>
                  <td className="px-3 py-2">{b.name}</td>
                  <td className="px-3 py-2">{b.is_active ? 'Active' : 'Inactive'}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      type="button"
                      className="text-teal-800 hover:underline"
                      onClick={() => setActiveBranchId(b.id)}
                    >
                      {activeBranch?.id === b.id ? 'Current' : 'Switch'}
                    </button>
                    <button
                      type="button"
                      className="text-gray-700 hover:underline"
                      onClick={() => toggleActive(b)}
                    >
                      {b.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BranchesPanel;
