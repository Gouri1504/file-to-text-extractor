// scripts/downloadModel.js
// Downloads the embedding model into the local cache at build time so the
// running server never has to fetch it (faster cold starts on free hosts).
//
//   npm run download-model

import { pipeline } from '@huggingface/transformers';

const model = process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
const started = Date.now();
await pipeline('feature-extraction', model, { dtype: 'q8' });
console.log(`Cached ${model} in ${Date.now() - started}ms`);
