// services/embedding.service.js
// Local sentence embeddings with all-MiniLM-L6-v2 (384 dims) via
// @huggingface/transformers. The model runs in-process on CPU, so there's
// no API key or quota - the only cost is ~23 MB downloaded on first use
// and a little RAM. The pipeline is loaded once and shared.

import { pipeline } from '@huggingface/transformers';
import env from '../config/env.js';

const BATCH_SIZE = 16;

let extractorPromise = null;

const getExtractor = () => {
  if (!extractorPromise) {
    // q8 = quantized weights: ~4x smaller and faster, negligible quality loss.
    extractorPromise = pipeline('feature-extraction', env.EMBEDDING_MODEL, { dtype: 'q8' })
      .catch((err) => {
        // Don't cache a failed load - let the next call retry.
        extractorPromise = null;
        throw err;
      });
  }
  return extractorPromise;
};

// Loads the model ahead of the first request so users don't pay the
// download/initialization cost. Safe to call without awaiting.
export const warmUp = async () => {
  const started = Date.now();
  await getExtractor();
  console.log(`[embedding] ${env.EMBEDDING_MODEL} ready in ${Date.now() - started}ms`);
};

// Returns one normalized vector per input text, so cosine similarity
// equals the dot product.
export const embed = async (texts) => {
  const extractor = await getExtractor();
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const output = await extractor(batch, { pooling: 'mean', normalize: true });
    vectors.push(...output.tolist());
  }
  return vectors;
};

export const embedOne = async (text) => (await embed([text]))[0];
