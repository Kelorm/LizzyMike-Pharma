import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Lock, Unlock } from 'lucide-react';
import api from '../services/api';
import { hasPermission } from '../utils/permissions';
import { useAuth } from '../contexts/AuthContext';
import { useBranch } from '../contexts/BranchContext';

export type BusinessDayInfo = {
  id: string;
  business_date: string;
  status: 'open' | 'closed';
  opened_at?: string;
  opened_by_name?: string;
  opening_float?: string;
  open_notes?: string;
  closed_at?: string | null;
  closed_by_name?: string | null;
  closing_cash?: string | null;
};

type CurrentResponse = {
  status: 'open' | 'closed';
  day: BusinessDayInfo | null;
};

interface BusinessDayPanelProps {
  compact?: boolean;
  onStatusChange?: (isOpen: boolean) => void;
}

const BusinessDayPanel: React.FC<BusinessDayPanelProps> = ({ compact = false, onStatusChange }) => {
  const { user } = useAuth();
  const { activeBranch } = useBranch();
  const canOpen = hasPermission(user?.role, 'open_business_day');
  const canClose = hasPermission(user?.role, 'close_business_day');

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<CurrentResponse | null>(null);
  const [openingFloat, setOpeningFloat] = useState('0');
  const [openNotes, setOpenNotes] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.businessDay.current();
      const data = res.data as CurrentResponse;
      setCurrent(data);
      onStatusChange?.(data.status === 'open');
    } catch {
      toast.error('Failed to load trading day status');
      onStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onBranch = () => {
      refresh();
    };
    window.addEventListener('branch-changed', onBranch);
    return () => window.removeEventListener('branch-changed', onBranch);
  }, [refresh]);

  const handleOpen = async () => {
    if (!canOpen) return;
    setBusy(true);
    try {
      await api.businessDay.open({
        opening_float: openingFloat || '0',
        open_notes: openNotes.trim() || undefined,
      });
      toast.success(current?.day ? 'Trading day reopened' : 'Trading day opened');
      setOpenNotes('');
      await refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Could not open day');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!canClose) return;
    if (!window.confirm('Close the trading day? Sales will stop until an admin reopens the day.')) {
      return;
    }
    setBusy(true);
    try {
      await api.businessDay.close({
        closing_cash: closingCash !== '' ? closingCash : undefined,
        close_notes: closeNotes.trim() || undefined,
      });
      toast.success('Trading day closed');
      setClosingCash('');
      setCloseNotes('');
      await refresh();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Could not close day');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading trading day…</p>;
  }

  const isOpen = current?.status === 'open';
  const day = current?.day;
  const isReopen = !isOpen && !!day;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-semibold text-gray-900">
              Trading day{activeBranch ? ` · ${activeBranch.code}` : ''}
            </p>
            <p className="text-sm text-gray-600">
              {isOpen
                ? `Open for ${day?.business_date || 'today'}${day?.opened_by_name ? ` · opened by ${day.opened_by_name}` : ''}`
                : isReopen
                  ? `Closed${day?.closed_by_name ? ` by ${day.closed_by_name}` : ''} — only an admin can reopen`
                  : 'Closed — sales are blocked until an admin opens the day'}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {isOpen ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
          {isOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      {canOpen && !isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Opening float (GHS)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingFloat}
              onChange={(e) => setOpeningFloat(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleOpen}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? (isReopen ? 'Reopening…' : 'Opening…') : isReopen ? 'Reopen trading day' : 'Open trading day'}
            </button>
          </div>
        </div>
      )}

      {canClose && isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-100 pt-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Closing cash (GHS)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input
              type="text"
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={busy}
              onClick={handleClose}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? 'Closing…' : 'Close trading day'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDayPanel;
