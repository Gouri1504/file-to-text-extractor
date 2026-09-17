// components/chat/ChatPanel.jsx
// Question box + conversation for "ask your documents". Each answer shows
// inline citation chips ([1], [2]...) that jump to the matching source
// card below it; each source card links to the originating document.
// `documentIds` optionally narrows the search (empty = all documents).

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MarkdownViewer from '../documents/MarkdownViewer.jsx';
import Button from '../ui/Button.jsx';
import { apiAsk } from '../../api/chat.api.js';

const CITE_PREFIX = '#cite-';

// Turns "[1, 3]" / "[2]" into markdown links the renderer below turns into
// chips. Numbers without a matching source are dropped rather than shown
// as dead references.
const linkCitations = (answer, messageId, validNumbers) =>
  answer.replace(/\[(\d+(?:\s*,\s*\d+)*)\]/g, (_, group) =>
    group
      .split(',')
      .map((n) => Number(n.trim()))
      .filter((n) => validNumbers.has(n))
      .map((n) => `[${n}](${CITE_PREFIX}${messageId}-${n})`)
      .join(' '),
  );

const sourceElementId = (messageId, n) => `source-${messageId}-${n}`;

function CitationChip({ href, children }) {
  const target = href.slice(CITE_PREFIX.length);
  const handleClick = () => {
    const el = document.getElementById(`source-${target}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.classList.remove('source--flash');
    // Force reflow so the animation restarts on repeated clicks.
    void el.offsetWidth;
    el.classList.add('source--flash');
  };
  return (
    <button type="button" className="cite" onClick={handleClick} title="Show source">
      {children}
    </button>
  );
}

const markdownComponents = {
  a: ({ href = '', children, ...rest }) =>
    href.startsWith(CITE_PREFIX) ? (
      <CitationChip href={href}>{children}</CitationChip>
    ) : (
      <a href={href} target="_blank" rel="noreferrer" {...rest}>{children}</a>
    ),
};

function AssistantMessage({ message }) {
  const valid = new Set(message.citations.map((c) => c.n));
  return (
    <div className="chat__msg chat__msg--assistant">
      <MarkdownViewer
        markdown={linkCitations(message.text, message.id, valid)}
        components={markdownComponents}
      />
      {message.citations.length > 0 && (
        <div className="sources">
          <div className="sources__title">Sources</div>
          {message.citations.map((c) => (
            <div key={c.n} id={sourceElementId(message.id, c.n)} className="source">
              <div className="source__head">
                <span className="cite cite--static">{c.n}</span>
                <Link to={`/documents/${c.documentId}`} className="source__doc">
                  {c.filename}
                </Link>
                {c.section && <span className="source__section">› {c.section}</span>}
              </div>
              <p className="source__snippet">{c.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatPanel({ documentIds, placeholder, emptyHint }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const endRef = useRef(null);
  const nextId = useRef(1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, asking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking) return;

    const userMsg = { id: nextId.current++, role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setAsking(true);
    try {
      const data = await apiAsk({
        question: q,
        documentIds: documentIds?.length ? documentIds : undefined,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: 'assistant',
          text: data.answer,
          citations: data.citations ?? [],
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: 'error',
          text: err.response?.data?.message || 'Could not get an answer. Please try again.',
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  // Enter sends, Shift+Enter adds a newline.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) handleSubmit(e);
  };

  return (
    <div className="chat">
      <div className="chat__log" aria-live="polite">
        {messages.length === 0 && (
          <p className="muted chat__empty">
            {emptyHint || 'Ask anything about your extracted documents. Answers cite their sources.'}
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {m.role === 'user' && <div className="chat__msg chat__msg--user">{m.text}</div>}
              {m.role === 'assistant' && <AssistantMessage message={m} />}
              {m.role === 'error' && <div className="alert alert--error">{m.text}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
        {asking && (
          <div className="chat__msg chat__msg--assistant chat__thinking">
            <span /><span /><span />
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form className="chat__form" onSubmit={handleSubmit}>
        <textarea
          className="chat__input"
          rows={2}
          maxLength={1000}
          value={question}
          placeholder={placeholder || 'e.g. What was the total amount claimed?'}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="submit" loading={asking} disabled={!question.trim()}>
          Ask
        </Button>
      </form>
    </div>
  );
}
