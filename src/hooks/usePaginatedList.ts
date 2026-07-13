import { useEffect, useState } from 'react';
import type { Paginated, Pagination } from '../services/http';

const EMPTY: Pagination = { count: 0, page: 1, limit: 25, totalPages: 1 };

/**
 * Page-based list state for the admin tables. Calls `fetcher(page)` (which
 * returns `{results, pagination}` from `http.getPaginated`), tracks the current
 * page, and resets to page 1 whenever `deps` change (e.g. the search query).
 *
 * Usage:
 *   const { rows, pagination, page, setPage, loading, reload } =
 *     usePaginatedList((page) => adminService.students.listPage(q, page), [q]);
 */
export function usePaginatedList<T>(
  fetcher: (page: number) => Promise<Paginated<T>>,
  deps: unknown[] = [],
) {
  const [page, setPage] = useState(1);
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState<Paginated<T>>();
  const [loading, setLoading] = useState(true);

  // Reset to the first page when the external inputs (search/filter) change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setPage(1), deps);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetcher(page)
      .then((res) => alive && setData(res))
      .catch(() => alive && setData({ results: [], pagination: EMPTY }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, nonce, ...deps]);

  return {
    rows: data?.results ?? [],
    pagination: data?.pagination ?? EMPTY,
    page,
    setPage,
    loading,
    reload: () => setNonce((n) => n + 1),
  };
}
