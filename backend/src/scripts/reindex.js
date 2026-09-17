// scripts/reindex.js
// Backfills the Pinecone index for documents that were extracted before
// Q&A was enabled (or whose indexing failed).
//
//   npm run reindex          -> only docs not yet indexed
//   npm run reindex -- --all -> every processed doc

import mongoose from 'mongoose';
import env from '../config/env.js';
import { connectDB } from '../config/db.js';
import Document from '../models/Document.model.js';
import { indexForSearch } from '../services/document.service.js';

const all = process.argv.includes('--all');

const run = async () => {
  if (!env.RAG_ENABLED) {
    console.error('PINECONE_API_KEY is not set - nothing to do.');
    process.exit(1);
  }

  await connectDB();

  const filter = { status: 'done' };
  if (!all) filter.indexStatus = { $ne: 'indexed' };
  const docs = await Document.find(filter);
  console.log(`Indexing ${docs.length} document(s)...`);

  let failed = 0;
  for (const [i, doc] of docs.entries()) {
    await indexForSearch(doc);
    const ok = doc.indexStatus === 'indexed';
    if (!ok) failed += 1;
    console.log(
      `[${i + 1}/${docs.length}] ${ok ? 'ok  ' : 'FAIL'} ${doc.filename}` +
        (ok ? ` (${doc.chunkCount} chunks)` : ` - ${doc.indexError}`),
    );
  }

  console.log(`Done. ${docs.length - failed} indexed, ${failed} failed.`);
  await mongoose.disconnect();
  process.exit(failed ? 1 : 0);
};

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
