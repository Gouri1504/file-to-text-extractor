// components/documents/DocumentList.jsx
// Grid of DocumentCard, with staggered entry animation so cards appear
// one after another instead of all at once. Empty/loading/error states
// are owned by this component so the parent page stays clean.

import { motion, AnimatePresence } from 'framer-motion';
import DocumentCard from './DocumentCard.jsx';
import Skeleton from '../ui/Skeleton.jsx';

const containerVariants = {
  // Stagger the children's entry. Pure cosmetic; framer-motion respects
  // prefers-reduced-motion automatically when the user opts out at OS level.
  enter: { transition: { staggerChildren: 0.05 } },
};

export default function DocumentList({
  documents,
  loading,
  error,
  selectable,
  selectedIds,
  onSelect,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card card--skeleton">
            <Skeleton height={20} width="60%" />
            <Skeleton height={14} width="40%" style={{ marginTop: 12 }} />
            <Skeleton height={14} width="30%" style={{ marginTop: 6 }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className="alert alert--error">{error}</div>;

  if (!documents.length) {
    return (
      <div className="empty-state">
        <h3>No documents yet</h3>
        <p>Upload a claim document to see your extracted data here.</p>
      </div>
    );
  }

  return (
    <motion.div className="grid" variants={containerVariants} initial="initial" animate="enter">
      <AnimatePresence>
        {documents.map((doc) => (
          <DocumentCard
            key={doc._id}
            doc={doc}
            selectable={selectable}
            selected={selectedIds?.includes(doc._id)}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
