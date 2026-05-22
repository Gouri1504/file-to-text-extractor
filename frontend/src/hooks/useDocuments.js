// hooks/useDocuments.js
// Tiny data hook that owns the user's document list. Keeps the dashboard
// component focused on rendering instead of fetch plumbing. Exposes the
// list, loading + error flags, and a refresh function so callers can
// trigger a reload after upload/delete without remounting the page.

import { useCallback, useEffect, useState } from 'react';
import { apiListDocuments } from '../api/document.api.js';

export default function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListDocuments();
      setDocuments(data?.documents ?? []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, loading, error, refresh, setDocuments };
}
