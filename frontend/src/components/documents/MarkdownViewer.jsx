// components/documents/MarkdownViewer.jsx
// Renders backend-supplied markdown with GFM (tables, strikethrough, task
// lists). The wrapper class drives all typography/table styling in
// globals.css so this component stays content-only.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownViewer({ markdown }) {
  if (!markdown) {
    return <div className="empty-state"><p>No content to display.</p></div>;
  }
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
