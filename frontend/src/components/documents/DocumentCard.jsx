// components/documents/DocumentCard.jsx
// Single row in the documents list. Memoized animation via framer-motion;
// click navigates to detail. The optional onSelect prop turns the card
// into a checkbox-style selectable card for the comparison page.

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatDate, formatSize } from '../../utils/format.js';

const statusLabel = {
  done: 'Ready',
  pending: 'Processing...',
  failed: 'Failed',
};

export default function DocumentCard({ doc, selectable, selected, onSelect, onDelete }) {
  const inner = (
    <>
      <div className="card__head">
        <div className="card__filename" title={doc.filename}>{doc.filename}</div>
        <span className={`badge badge--${doc.status}`}>{statusLabel[doc.status] ?? doc.status}</span>
      </div>
      <div className="card__meta">
        <span>{formatDate(doc.createdAt)}</span>
        {doc.size != null && <span>{formatSize(doc.size)}</span>}
        <span className="card__mime">{doc.mimeType}</span>
      </div>
      {doc.status === 'failed' && doc.error && (
        <div className="card__error">{doc.error}</div>
      )}
    </>
  );

  return (
    <motion.div
      className={`card ${selected ? 'card--selected' : ''}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
    >
      {selectable ? (
        <label className="card__select">
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => onSelect?.(doc, e.target.checked)}
            disabled={doc.status !== 'done'}
          />
          <div className="card__body">{inner}</div>
        </label>
      ) : (
        <Link to={`/documents/${doc._id}`} className="card__body">{inner}</Link>
      )}

      {!selectable && onDelete && (
        <button
          type="button"
          className="card__delete"
          onClick={(e) => {
            e.preventDefault();
            onDelete(doc);
          }}
          aria-label="Delete"
        >
          ×
        </button>
      )}
    </motion.div>
  );
}
