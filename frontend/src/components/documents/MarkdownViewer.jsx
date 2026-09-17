// components/documents/MarkdownViewer.jsx
// Renders backend-supplied markdown with GFM (tables, strikethrough, task
// lists). The wrapper class drives all typography/table styling in
// globals.css so this component stays content-only.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// `components` optionally overrides element renderers (e.g. chat answers
// turn citation links into chips).
export default function MarkdownViewer({ markdown, components }) {
  if (!markdown) {
    return <div className="empty-state"><p>No content to display.</p></div>;
  }
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{markdown}</ReactMarkdown>
    </div>
  );
}
