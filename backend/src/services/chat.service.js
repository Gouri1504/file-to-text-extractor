// services/chat.service.js
// Retrieval-augmented Q&A: embed the question -> search the user's chunks
// in Pinecone -> ask the LLM to answer from them -> return the answer with
// the sources it actually cited.

import Document from '../models/Document.model.js';
import { search } from './vector.service.js';
import { answerQuestion } from './ai.service.js';
import { NOT_FOUND_ANSWER } from '../prompts/answerQuestion.prompt.js';

const SNIPPET_CHARS = 300;

// Collects the source numbers referenced as [2], [1, 3] or [1][2].
const citedNumbers = (answer, max) => {
  const used = new Set();
  for (const [, group] of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const n of group.split(',').map((x) => Number(x.trim()))) {
      if (n >= 1 && n <= max) used.add(n);
    }
  }
  return [...used].sort((a, b) => a - b);
};

export const ask = async ({ userId, question, documentIds }) => {
  const matches = await search({ userId, question, documentIds });

  // Defense in depth: only keep chunks whose document still exists and
  // belongs to this user (covers vectors orphaned by a failed cleanup).
  const ownedIds = new Set(
    (
      await Document.find(
        { _id: { $in: [...new Set(matches.map((m) => m.documentId))] }, userId },
        '_id',
      ).lean()
    ).map((d) => d._id.toString()),
  );
  const sources = matches.filter((m) => ownedIds.has(m.documentId));

  if (sources.length === 0) {
    return { answer: NOT_FOUND_ANSWER, citations: [] };
  }

  const answer = await answerQuestion(question, sources);

  const citations = citedNumbers(answer, sources.length).map((n) => {
    const s = sources[n - 1];
    return {
      n,
      documentId: s.documentId,
      filename: s.filename,
      section: s.section,
      chunkIndex: s.chunkIndex,
      score: Number(s.score.toFixed(3)),
      snippet: s.text.length > SNIPPET_CHARS ? `${s.text.slice(0, SNIPPET_CHARS)}…` : s.text,
    };
  });

  return { answer, citations };
};
