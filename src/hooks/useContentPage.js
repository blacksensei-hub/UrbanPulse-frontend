import { useEffect, useState } from 'react';
import { contentService } from '../services/index.js';

// Fetches a single content_pages row by slug. Mirrors the cancel-on-cleanup
// pattern from ProductDetail.jsx exactly (plain closure flag, no refs/request-id
// guards) so this doesn't reintroduce the "stuck on Loading…" bug on first
// in-app navigation.
export function useContentPage(slug) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchFailed(false);
    setNotFoundFlag(false);
    setSlowLoad(false);
    const slowTimer = setTimeout(() => { if (!cancelled) setSlowLoad(true); }, 5000);
    contentService
      .get(slug)
      .then((data) => {
        if (cancelled) return;
        setPage(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setPage(null);
        if (err?.response?.status === 404) setNotFoundFlag(true);
        else setFetchFailed(true);
        console.error('contentService.get failed', err);
      })
      .finally(() => { if (!cancelled) setLoading(false); clearTimeout(slowTimer); });
    return () => { cancelled = true; clearTimeout(slowTimer); };
  }, [slug, retryToken]);

  return {
    page,
    loading,
    fetchFailed,
    notFoundFlag,
    slowLoad,
    retry: () => setRetryToken((n) => n + 1),
  };
}
