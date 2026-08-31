import React, { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface AuditRow {
  id: string;
  timestamp: string;
  user_name?: string | null;
  action: string;
  entity: string;
  entity_id: string;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
}

const ACTION_OPTIONS = [
  '',
  'create',
  'update',
  'delete',
  'login',
  'open',
  'reopen',
  'close',
];

const ENTITY_OPTIONS = [
  '',
  'sale',
  'medication',
  'user',
  'customer',
  'prescription',
  'restock',
  'discount',
  'promotion',
  'business_day',
  'pharmacy_profile',
  'auth',
];

function formatRelative(iso: string, nowMs: number): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffSec = Math.max(0, Math.round((nowMs - then) / 1000));
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function detailsSummary(details?: Record<string, unknown> | null): string {
  if (!details || typeof details !== 'object') return '';
  const keys = Object.keys(details);
  if (keys.length === 0) return '';
  const parts = keys.slice(0, 3).map((k) => {
    const v = details[k];
    if (v === null || v === undefined) return `${k}=—`;
    if (typeof v === 'object') return `${k}=…`;
    return `${k}=${String(v)}`;
  });
  const extra = keys.length > 3 ? ` +${keys.length - 3}` : '';
  return parts.join(', ') + extra;
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const AuditTrailPage: React.FC = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const firstLoad = useRef(true);

  const fetchRows = useCallback(async (soft = false) => {
    if (soft) {
      setRefreshing(true);
    } else if (firstLoad.current) {
      setLoading(true);
    }
    try {
      const params: Record<string, string> = {
        page_size: '100',
        ordering: '-timestamp',
      };
      if (actionFilter) params.action = actionFilter;
      if (entityFilter) params.entity = entityFilter;

      const res = await api.audit.list(params);
      const data = res.data?.results ?? res.data ?? [];
      setRows(Array.isArray(data) ? data : []);
      setLastUpdated(Date.now());
    } catch {
      toast.error('Failed to load audit trail');
    } finally {
      setLoading(false);
      setRefreshing(false);
      firstLoad.current = false;
    }
  }, [actionFilter, entityFilter]);

  useEffect(() => {
    fetchRows(false);
  }, [fetchRows]);

  useEffect(() => {
    const tick = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  const handleExportCSV = () => {
    if (rows.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    const headers = [
      'Timestamp',
      'User',
      'Action',
      'Entity',
      'Entity ID',
      'Details',
      'IP Address',
    ];
    const lines = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) =>
        [
          row.timestamp,
          row.user_name || '',
          row.action,
          row.entity,
          row.entity_id,
          row.details ? JSON.stringify(row.details) : '',
          row.ip_address || '',
        ]
          .map(csvEscape)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `audit-trail-${stamp}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} events`);
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading audit trail…</div>;
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Audit Trail</h1>
          <p className="text-sm text-gray-600">
            Server-recorded system actions (admin only). Use Refresh to load the latest events.
          </p>
          {lastUpdated != null && (
            <p className="text-xs text-gray-500 mt-1">
              Updated {formatRelative(new Date(lastUpdated).toISOString(), nowTick)}
              {refreshing ? ' · refreshing…' : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={rows.length === 0}
            className="px-4 py-2 text-sm font-medium text-teal-800 bg-white border border-teal-700 hover:bg-teal-50 rounded-md disabled:opacity-60"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => fetchRows(true)}
            disabled={refreshing}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Action
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
          >
            <option value="">All</option>
            {ACTION_OPTIONS.filter(Boolean).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          Entity
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
          >
            <option value="">All</option>
            {ENTITY_OPTIONS.filter(Boolean).map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No audit events yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const summary = detailsSummary(row.details);
                const expanded = expandedId === row.id;
                const hasDetails = Boolean(row.details && Object.keys(row.details).length);
                return (
                  <React.Fragment key={row.id}>
                    <tr className="border-t border-gray-100 hover:bg-gray-50/80">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div title={new Date(row.timestamp).toLocaleString()}>
                          {formatRelative(row.timestamp, nowTick)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(row.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3">{row.user_name || '—'}</td>
                      <td className="px-4 py-3">{row.action}</td>
                      <td className="px-4 py-3">{row.entity}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.entity_id || '—'}</td>
                      <td className="px-4 py-3 max-w-xs">
                        {hasDetails ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : row.id)}
                            className="text-left text-teal-800 hover:underline"
                          >
                            {expanded ? 'Hide' : summary || 'View'}
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                    {expanded && hasDetails && (
                      <tr className="bg-gray-50 border-t border-gray-100">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all font-mono">
                            {JSON.stringify(row.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditTrailPage;
