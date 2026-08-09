import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchUsersDirectory, type UserDirectoryItem } from '@/lib/api-client';
import { useDebouncedValue } from './use-debounced-value';
import { usePagination } from './use-pagination';

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export function useUserSearch() {
  const { getToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, DEBOUNCE_MS);
  const { page, setPage, hasMore, setHasMore, reset } = usePagination(1);

  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reset();
    setUsers([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      const loadingMore = page > 1;
      loadingMore ? setIsLoadingMore(true) : setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Unable to retrieve Clerk session token.');
        }

        const result = await fetchUsersDirectory(token, {
          search: debouncedSearch || undefined,
          page,
          limit: PAGE_SIZE,
        });

        if (!isCancelled) {
          setUsers((prev) =>
            page === 1 ? result.users : [...prev, ...result.users],
          );
          setHasMore(page < result.totalPages);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load users.',
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    }

    run();

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, page, getToken, setHasMore]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading && !isLoadingMore) {
      setPage((prev) => prev + 1);
    }
  }, [hasMore, isLoading, isLoadingMore, setPage]);

  return {
    users,
    searchTerm,
    setSearchTerm,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
  };
}
