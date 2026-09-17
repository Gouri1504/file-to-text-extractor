// config/pinecone.js
// Single shared Pinecone client + index handle. Created lazily so a
// deployment without PINECONE_API_KEY never touches the SDK.
//
// getIndex() also makes sure the index exists: if it's missing it is
// created (serverless, 384 dims, cosine) and we wait until it's ready; if
// it exists with the wrong shape we fail with a clear message instead of
// letting every upsert error out.

import { Pinecone } from '@pinecone-database/pinecone';
import env from './env.js';

// all-MiniLM-L6-v2 produces 384-dim vectors; the index must match.
export const EMBEDDING_DIMENSION = 384;
const METRIC = 'cosine';

let client = null;
let readyPromise = null;

export const getPinecone = () => {
  if (!env.RAG_ENABLED) {
    throw new Error('Pinecone is not configured (PINECONE_API_KEY missing)');
  }
  if (!client) client = new Pinecone({ apiKey: env.PINECONE_API_KEY });
  return client;
};

const ensureIndex = async () => {
  const pc = getPinecone();
  const name = env.PINECONE_INDEX;
  const { indexes = [] } = await pc.listIndexes();
  const existing = indexes.find((i) => i.name === name);

  if (!existing) {
    console.log(
      `[pinecone] index "${name}" not found - creating it ` +
        `(${EMBEDDING_DIMENSION} dims, ${METRIC}, ${env.PINECONE_CLOUD}/${env.PINECONE_REGION})...`,
    );
    await pc.createIndex({
      name,
      dimension: EMBEDDING_DIMENSION,
      metric: METRIC,
      spec: { serverless: { cloud: env.PINECONE_CLOUD, region: env.PINECONE_REGION } },
      // Another instance may be creating it at the same time.
      suppressConflicts: true,
      waitUntilReady: true,
    });
    console.log(`[pinecone] index "${name}" is ready`);
    return;
  }

  if (existing.dimension !== EMBEDDING_DIMENSION || existing.metric !== METRIC) {
    throw new Error(
      `Pinecone index "${name}" has dimension ${existing.dimension} / metric ${existing.metric}, ` +
        `but ${EMBEDDING_DIMENSION} / ${METRIC} is required. Delete it or set PINECONE_INDEX to a new name.`,
    );
  }
};

// Resolves to the index handle once the index is known to exist. A failed
// check isn't cached, so the next call retries (e.g. after a network blip).
export const getIndex = async () => {
  if (!readyPromise) {
    readyPromise = ensureIndex().catch((err) => {
      readyPromise = null;
      throw err;
    });
  }
  await readyPromise;
  return getPinecone().index({ name: env.PINECONE_INDEX });
};
