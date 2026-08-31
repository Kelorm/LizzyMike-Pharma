import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import apiClient from '../utils/axios';
import { useAuth } from './AuthContext';

export type BranchInfo = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
  phone?: string;
  email?: string;
  license_no?: string;
  address?: string;
  tax_enabled?: boolean;
  tax_rate?: string | number;
};

type BranchContextType = {
  branches: BranchInfo[];
  activeBranch: BranchInfo | null;
  setActiveBranchId: (id: string) => void;
  refreshBranches: () => Promise<void>;
  loading: boolean;
};

const BranchContext = createContext<BranchContextType | null>(null);
const STORAGE_KEY = 'active_branch_id';

export function setAxiosBranchHeader(branchId: string | null) {
  if (branchId) {
    apiClient.defaults.headers.common['X-Branch-Id'] = branchId;
  } else {
    delete apiClient.defaults.headers.common['X-Branch-Id'];
  }
}

export const BranchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const refreshBranches = useCallback(async () => {
    if (!isAuthenticated) {
      setBranches([]);
      setActiveBranchIdState(null);
      setAxiosBranchHeader(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get('/branches/');
      const list = (res.data?.results ?? res.data ?? []) as BranchInfo[];
      const rows = Array.isArray(list) ? list : [];
      setBranches(rows);

      let nextId = activeBranchId;
      if (!nextId || !rows.some((b) => String(b.id) === String(nextId))) {
        const hq = rows.find((b) => String(b.code).toUpperCase() === 'HQ');
        nextId = hq ? String(hq.id) : rows[0] ? String(rows[0].id) : null;
      }
      if (nextId) {
        localStorage.setItem(STORAGE_KEY, nextId);
        setAxiosBranchHeader(nextId);
        setActiveBranchIdState(nextId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setAxiosBranchHeader(null);
        setActiveBranchIdState(null);
      }
    } catch {
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeBranchId]);

  useEffect(() => {
    if (authLoading) return;
    refreshBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.id]);

  const setActiveBranchId = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEY, id);
    setAxiosBranchHeader(id);
    setActiveBranchIdState(id);
    window.dispatchEvent(new CustomEvent('branch-changed', { detail: { id } }));
  }, []);

  const activeBranch = useMemo(
    () => branches.find((b) => String(b.id) === String(activeBranchId)) || null,
    [branches, activeBranchId]
  );

  const value = useMemo(
    () => ({
      branches,
      activeBranch,
      setActiveBranchId,
      refreshBranches,
      loading,
    }),
    [branches, activeBranch, setActiveBranchId, refreshBranches, loading]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};

export const useBranch = (): BranchContextType => {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error('useBranch must be used within BranchProvider');
  }
  return ctx;
};
