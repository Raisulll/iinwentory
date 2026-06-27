import {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from 'react';
import type { TeamMember, TeamMemberRole } from '../types';
import { apiGet, apiPut, apiDelete } from '../lib/api';
import { useAuth } from './useAuthStore';
import { cacheGet, cacheSet } from '../lib/cache';
import { getBootstrap } from '../lib/bootstrap';

type AssignableRole = 'admin' | 'member' | 'client';

interface TeamContextType {
  members: TeamMember[];
  loading: boolean;
  refresh: () => Promise<void>;
  getMemberById: (id: string) => TeamMember | undefined;
  /** Optimistically change a member's role; rolls back if the server rejects. */
  updateMemberRole: (userId: string, role: AssignableRole) => Promise<void>;
  /** Optimistically remove a member; rolls back if the server rejects. */
  removeMember: (userId: string) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | null>(null);

export function TeamProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, org } = useAuth();
  const orgId = org?.id ?? null;
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  // Manual refetch — bypasses bootstrap dedupe by calling the dedicated route.
  const refresh = useCallback(async () => {
    if (!isLoggedIn) { setMembers([]); return; }
    try {
      setLoading(true);
      const fetched = await apiGet<TeamMember[]>('/api/team');
      setMembers(fetched);
      if (orgId) cacheSet(orgId, 'team', fetched);
    } catch {
      // Keep cached state on failure.
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, orgId]);

  useEffect(() => {
    if (!isLoggedIn) {
      setMembers([]);
      return;
    }
    const cached = cacheGet<TeamMember[]>(orgId, 'team');
    if (cached) {
      setMembers(cached);
      setLoading(false);
    }
    if (!orgId) return;
    getBootstrap(orgId)
      .then(data => {
        const fetched = data.team as TeamMember[];
        setMembers(fetched);
        cacheSet(orgId, 'team', fetched);
      })
      .catch(() => { /* keep cached state */ })
      .finally(() => setLoading(false));
  }, [isLoggedIn, orgId]);

  const getMemberById = useCallback((id: string) => members.find(m => m.id === id), [members]);

  // Optimistic role change — the UI flips the instant you click, the PUT runs
  // in the background, and we only revert (and surface the error) if it fails.
  // This replaces the old "await PUT, then await a full /api/team refetch"
  // flow that left the picker stuck on the old role until two round-trips
  // completed (and silently never updated if the refetch failed).
  const updateMemberRole = useCallback(async (userId: string, role: AssignableRole): Promise<void> => {
    const snapshot = members;
    const next = members.map(m => m.id === userId ? { ...m, role: role as TeamMemberRole } : m);
    setMembers(next);
    if (orgId) cacheSet(orgId, 'team', next);
    try {
      await apiPut(`/api/team/members/${userId}/role`, { role });
    } catch (err) {
      setMembers(snapshot);
      if (orgId) cacheSet(orgId, 'team', snapshot);
      throw err;
    }
  }, [members, orgId]);

  const removeMember = useCallback(async (userId: string): Promise<void> => {
    const snapshot = members;
    const next = members.filter(m => m.id !== userId);
    setMembers(next);
    if (orgId) cacheSet(orgId, 'team', next);
    try {
      await apiDelete(`/api/team/members/${userId}`);
    } catch (err) {
      setMembers(snapshot);
      if (orgId) cacheSet(orgId, 'team', snapshot);
      throw err;
    }
  }, [members, orgId]);

  return (
    <TeamContext.Provider value={{ members, loading, refresh, getMemberById, updateMemberRole, removeMember }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error('useTeam must be used within a TeamProvider');
  return ctx;
}
