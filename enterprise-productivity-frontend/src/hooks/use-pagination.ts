import { useCallback, useState } from 'react';

export function usePagination(initialPage = 1) {
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);

  const reset = useCallback(() => {
    setPage(initialPage);
    setHasMore(true);
  }, [initialPage]);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  return { page, setPage, hasMore, setHasMore, nextPage, reset };
}
