// pages/AskPage.jsx
// "Ask your documents": question answering across the user's processed
// claims, with an optional document filter shown as toggle chips.

import { useState } from 'react';
import PageTransition from '../components/layout/PageTransition.jsx';
import ChatPanel from '../components/chat/ChatPanel.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import useDocuments from '../hooks/useDocuments.js';

export default function AskPage() {
  const { documents, loading } = useDocuments();
  const [selected, setSelected] = useState([]);

  const searchable = documents.filter((d) => d.status === 'done' && d.indexStatus === 'indexed');
  const notIndexed = documents.filter((d) => d.status === 'done' && d.indexStatus !== 'indexed');

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <PageTransition>
      <section className="container">
        <div className="page-header">
          <div>
            <h1>Ask your documents</h1>
            <p className="muted">
              Answers come only from your extracted claims, with numbered citations.
            </p>
          </div>
        </div>

        <div className="ask-scope">
          <span className="ask-scope__label">
            Search in: {selected.length === 0 ? 'all documents' : `${selected.length} selected`}
          </span>
          {loading ? (
            <Skeleton height={28} width="50%" />
          ) : (
            <div className="chips">
              {searchable.map((d) => (
                <button
                  key={d._id}
                  type="button"
                  className={`chip ${selected.includes(d._id) ? 'chip--active' : ''}`}
                  aria-pressed={selected.includes(d._id)}
                  onClick={() => toggle(d._id)}
                >
                  {d.filename}
                </button>
              ))}
              {selected.length > 0 && (
                <button type="button" className="chip chip--clear" onClick={() => setSelected([])}>
                  Clear
                </button>
              )}
            </div>
          )}
          {!loading && searchable.length === 0 && (
            <p className="muted">No searchable documents yet. Upload a claim on the dashboard first.</p>
          )}
          {notIndexed.length > 0 && (
            <p className="muted ask-scope__note">
              {notIndexed.length} processed document(s) aren&apos;t searchable yet. Open one and
              use &ldquo;Re-index&rdquo; to include it.
            </p>
          )}
        </div>

        <div className="result-panel">
          <ChatPanel documentIds={selected} />
        </div>
      </section>
    </PageTransition>
  );
}
