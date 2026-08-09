import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchUsersDirectory, type UserDirectoryItem } from '@/lib/api-client';

export function useTaskDirectory() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const result = await fetchUsersDirectory(token, { limit: 100 });
        if (!isCancelled) setUsers(result.users);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }
    load();
    return () => { isCancelled = true; };
  }, [getToken]);

  const nameById = (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? id : '—');

  return { users, isLoading, nameById };
}
