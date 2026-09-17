// api/chat.api.js
// Wrapper for /api/chat - question answering over indexed documents.
// Returns { answer, citations: [{ n, documentId, filename, section, snippet, score }] }.

import client, { unwrap } from './client.js';

export const apiAsk = ({ question, documentIds }) =>
  unwrap(client.post('/chat', { question, documentIds }));
