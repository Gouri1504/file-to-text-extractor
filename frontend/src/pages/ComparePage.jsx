// pages/ComparePage.jsx
// Two modes:
//   - "list" (default): grid of past comparisons + a "new" panel with
//     selectable document cards.
//   - "detail" (when ?id=...): shows the AI summary for one comparison.
// Stays in one route to make the back/forward UX intuitive.

import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition.jsx';
import DocumentList from '../components/documents/DocumentList.jsx';
import MarkdownViewer from '../components/documents/MarkdownViewer.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import useDocuments from '../hooks/useDocuments.js';
import {
  apiCreateComparison,
  apiListComparisons,
  apiGetComparison,
} from '../api/comparison.api.js';
import { formatDate } from '../utils/format.js';

export default function ComparePage() {
  const { documents, loading: docsLoading } = useDocuments();
  const [comparisons, setComparisons] = useState([]);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [params, setParams] = useSearchParams();
  const detailId = params.get('id');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refreshComparisons = async () => {
    try {
      const data = await apiListComparisons();
      setComparisons(data?.comparisons ?? []);
    } catch {
      // non-fatal - the empty list shows the right call to action.
    }
  };

  useEffect(() => {
    refreshComparisons();
  }, []);

  // Detail loader runs whenever the ?id query param changes.
  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const data = await apiGetComparison(detailId);
        if (!cancelled) setDetail(data?.comparison ?? null);
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  const handleSelect = (doc, checked) => {
    setSelected((prev) =>
      checked ? [...prev, doc._id] : prev.filter((id) => id !== doc._id),
    );
  };

  const handleCompare = async () => {
    if (selected.length < 2) {
      toast.error('Select at least 2 documents');
      return;
    }
    setSubmitting(true);
    const id = toast.loading('Asking Gemini to compare...');
    try {
      const data = await apiCreateComparison(selected);
      toast.success('Comparison ready', { id });
      setSelected([]);
      await refreshComparisons();
      if (data?.comparison?._id) setParams({ id: data.comparison._id });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Comparison failed', { id });
    } finally {
      setSubmitting(false);
    }
  };

  if (detailId) {
    return (
      <PageTransition>
        <section className="container">
          <button className="back-link" onClick={() => setParams({})}>
            &larr; Back to comparisons
          </button>

          {detailLoading || !detail ? (
            <>
              <Skeleton height={28} width="40%" />
              <Skeleton height={300} style={{ marginTop: 24 }} />
            </>
          ) : (
            <>
              <h1>Comparison</h1>
              <p className="muted">{formatDate(detail.createdAt)}</p>
              <div className="chips">
                {detail.documentIds?.map((d) => (
                  <Link key={d._id} to={`/documents/${d._id}`} className="chip">
                    {d.filename}
                  </Link>
                ))}
              </div>
              <div className="result-panel" style={{ marginTop: 24 }}>
                <MarkdownViewer markdown={detail.aiSummary} />
              </div>
            </>
          )}
        </section>
      </PageTransition>
    );
  }

  const eligible = documents.filter((d) => d.status === 'done');

  return (
    <PageTransition>
      <section className="container">
        <div className="page-header">
          <div>
            <h1>Compare documents</h1>
            <p className="muted">Select 2-5 of your processed claims and let AI summarize the differences.</p>
          </div>
          <div className="actions">
            <Button onClick={handleCompare} loading={submitting} disabled={selected.length < 2}>
              Compare {selected.length > 0 && `(${selected.length})`}
            </Button>
          </div>
        </div>

        <DocumentList
          documents={eligible}
          loading={docsLoading}
          selectable
          selectedIds={selected}
          onSelect={handleSelect}
        />

        <h2 className="section-title">Past comparisons</h2>
        {comparisons.length === 0 ? (
          <div className="empty-state"><p>No comparisons yet.</p></div>
        ) : (
          <motion.div className="grid">
            <AnimatePresence>
              {comparisons.map((c) => (
                <motion.div
                  key={c._id}
                  className="card"
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  whileHover={{ y: -2 }}
                >
                  <Link to={`?id=${c._id}`} className="card__body">
                    <div className="card__head">
                      <div className="card__filename">
                        {c.documentIds?.map((d) => d.filename).join(' \u00b7 ') || 'Comparison'}
                      </div>
                      <span className={`badge badge--${c.status}`}>{c.status}</span>
                    </div>
                    <div className="card__meta">
                      <span>{formatDate(c.createdAt)}</span>
                      <span>{c.documentIds?.length || 0} documents</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>
    </PageTransition>
  );
}
