// pages/DocumentDetailPage.jsx
// Detail view for a single processed document. Shows metadata,
// extracted markdown, and three actions: copy, download .md, download
// the original file (streamed from GridFS).

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import PageTransition from '../components/layout/PageTransition.jsx';
import MarkdownViewer from '../components/documents/MarkdownViewer.jsx';
import Button from '../components/ui/Button.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import { apiGetDocument, documentFileUrl } from '../api/document.api.js';
import { copyToClipboard, downloadText, triggerDownload } from '../utils/download.js';
import { formatDate, formatSize } from '../utils/format.js';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGetDocument(id);
        if (!cancelled) setDoc(data?.document ?? null);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleCopy = async () => {
    try {
      await copyToClipboard(doc.markdown || '');
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleDownloadMd = () => {
    downloadText(doc.markdown || '', `${doc.filename}.md`, 'text/markdown');
    toast.success('Markdown downloaded');
  };

  const handleDownloadOriginal = () => {
    triggerDownload(documentFileUrl(doc._id), doc.filename);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="container">
          <Skeleton height={28} width="40%" />
          <Skeleton height={16} width="20%" style={{ marginTop: 12 }} />
          <Skeleton height={300} style={{ marginTop: 24 }} />
        </div>
      </PageTransition>
    );
  }

  if (error || !doc) {
    return (
      <PageTransition>
        <div className="container">
          <div className="alert alert--error">{error || 'Not found'}</div>
          <Link to="/" className="btn btn--ghost" style={{ marginTop: 16 }}>Back to dashboard</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <section className="container">
        <Link to="/" className="back-link">&larr; Back to dashboard</Link>

        <motion.div
          className="page-header"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 style={{ wordBreak: 'break-all' }}>{doc.filename}</h1>
            <div className="muted">
              <span>{formatDate(doc.createdAt)}</span>
              {' \u00b7 '}
              <span>{doc.mimeType}</span>
              {doc.size != null && <> {' \u00b7 '} <span>{formatSize(doc.size)}</span></>}
              {' \u00b7 '}
              <span className={`badge badge--${doc.status}`}>{doc.status}</span>
            </div>
          </div>
          <div className="actions">
            <Button variant="ghost" onClick={handleCopy}>Copy</Button>
            <Button variant="ghost" onClick={handleDownloadMd}>Download .md</Button>
            <Button variant="ghost" onClick={handleDownloadOriginal}>Download original</Button>
          </div>
        </motion.div>

        {doc.status === 'failed' && doc.error && (
          <div className="alert alert--error" style={{ marginBottom: 16 }}>
            Extraction failed: {doc.error}
          </div>
        )}

        <div className="result-panel">
          <MarkdownViewer markdown={doc.markdown} />
        </div>
      </section>
    </PageTransition>
  );
}
