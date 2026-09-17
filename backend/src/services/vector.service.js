// services/vector.service.js
// Everything Pinecone-specific lives here. One index, default namespace;
// tenants are isolated by a mandatory `userId` metadata filter on every
// query (the Starter plan caps namespaces, so namespace-per-user would not
// scale). Record ids are `${documentId}#${chunkIndex}`, which lets us find
// all of a document's vectors with a prefix listing.

import { getIndex } from '../config/pinecone.js';
import { chunkMarkdown } from './chunking.service.js';
import { embed, embedOne } from './embedding.service.js';

const UPSERT_BATCH = 100;
const DELETE_BATCH = 1000;
// Pinecone caps metadata at 40 KB per record; chunks are ~800 chars so this
// only guards against pathological input.
const MAX_METADATA_TEXT = 1500;
// Cosine similarity floor below which a match is treated as irrelevant.
const MIN_SCORE = 0.25;

const recordId = (documentId, index) => `${documentId}#${index}`;

const listDocumentVectorIds = async (documentId) => {
  const index = await getIndex();
  const ids = [];
  let paginationToken;
  do {
    const page = await index.listPaginated({ prefix: `${documentId}#`, paginationToken });
    ids.push(...(page.vectors ?? []).map((v) => v.id));
    paginationToken = page.pagination?.next;
  } while (paginationToken);
  return ids;
};

const deleteIds = async (ids) => {
  const index = await getIndex();
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    await index.deleteMany({ ids: ids.slice(i, i + DELETE_BATCH) });
  }
};

// Chunks + embeds a document's markdown and upserts it. Idempotent: ids are
// deterministic, so re-indexing overwrites in place, and any leftover chunks
// from a longer previous version are deleted afterwards. Returns the number
// of chunks stored.
export const indexDocument = async (doc) => {
  const documentId = doc._id.toString();
  const chunks = chunkMarkdown(doc.markdown);

  // Section heading is embedded alongside the text - it carries a lot of
  // meaning for short chunks like "Amount: 500".
  const vectors = await embed(
    chunks.map((c) => (c.section ? `${c.section}\n${c.text}` : c.text)),
  );

  const records = chunks.map((c, i) => ({
    id: recordId(documentId, c.index),
    values: vectors[i],
    metadata: {
      userId: doc.userId.toString(),
      documentId,
      filename: doc.filename,
      section: c.section,
      chunkIndex: c.index,
      text: c.text.slice(0, MAX_METADATA_TEXT),
    },
  }));

  const existingIds = await listDocumentVectorIds(documentId);

  const index = await getIndex();
  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    await index.upsert({ records: records.slice(i, i + UPSERT_BATCH) });
  }

  const keep = new Set(records.map((r) => r.id));
  await deleteIds(existingIds.filter((id) => !keep.has(id)));

  return records.length;
};

export const deleteDocumentVectors = async (documentId) => {
  await deleteIds(await listDocumentVectorIds(documentId.toString()));
};

// Semantic search over one user's chunks, optionally narrowed to specific
// documents. Returns [{ documentId, filename, section, chunkIndex, text, score }].
export const search = async ({ userId, question, documentIds, topK = 6 }) => {
  const filter = { userId: { $eq: userId.toString() } };
  if (documentIds?.length) {
    filter.documentId = { $in: documentIds.map(String) };
  }

  const index = await getIndex();
  const result = await index.query({
    vector: await embedOne(question),
    topK,
    filter,
    includeMetadata: true,
  });

  return (result.matches ?? [])
    .filter((m) => m.metadata && (m.score ?? 0) >= MIN_SCORE)
    .map((m) => ({
      documentId: m.metadata.documentId,
      filename: m.metadata.filename,
      section: m.metadata.section,
      chunkIndex: m.metadata.chunkIndex,
      text: m.metadata.text,
      score: m.score,
    }));
};
