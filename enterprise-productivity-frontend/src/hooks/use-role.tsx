'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/nextjs';
import { fetchMe, hasMinRole, type MeResponse, type UserRole } from '@/lib/api-client';

export type Permission =
  | 'manage_users'
  | 'create_channel'
  | 'create_announcement'
  | 'create_task'
  | 'create_meeting';

export const PERMISSION_MIN_ROLE: Record<Permission, UserRole> = {
  manage_users: 'admin',
  create_channel: 'manager',
  create_announcement: 'manager',
  create_task: 'team_lead',
  create_meeting: 'team_lead',
};

interface RoleContextValue {
  role: UserRole | null;
  me: MeResponse | null;
  isLoading: boolean;
  error: string | null;
  hasRole: (minimum: UserRole) => boolean;
  can: (permission: Permission) => boolean;
  refresh: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  me: null,
  isLoading: true,
  error: null,
  hasRole: () => false,
  can: () => false,
  refresh: async () => {},
});

export function useRole() {
  return useContext(RoleContext);
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setMe(null);
        setError(null);
        setIsLoading(false);
        return;
      }
      const profile = await fetchMe(token);
      setMe(profile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasRole = useCallback(
    (minimum: UserRole) => hasMinRole(me?.role, minimum),
    [me],
  );

  const can = useCallback(
    (permission: Permission) => hasMinRole(me?.role, PERMISSION_MIN_ROLE[permission]),
    [me],
  );

  return (
    <RoleContext.Provider value={{ role: me?.role ?? null, me, isLoading, error, hasRole, can, refresh }}>
      {children}
    </RoleContext.Provider>
  );
}
