// services/document.service.js
// Orchestrates the upload pipeline: store original in GridFS -> create
// Document row in "pending" state -> call Gemini -> patch the row to "done"
// (or "failed" on error). Lives in services/ rather than controllers/ so
// the same logic can be triggered from a future background worker without
// dragging in Express's req/res.

import mongoose from 'mongoose';
import Document from '../models/Document.model.js';
import Comparison from '../models/Comparison.model.js';
import ApiError from '../utils/ApiError.js';
import { putBuffer, deleteFile } from './storage.service.js';
// Goes through ai.service so Gemini failures auto-fall-back to Groq when
// configured. The rest of this file is provider-agnostic.
import { extractClaim, compareClaims } from './ai.service.js';

export const createAndExtract = async ({ userId, file }) => {
  // 1) Persist the original bytes first - if Gemini fails later, the user
  //    can still re-trigger extraction without re-uploading.
  const fileId = await putBuffer({
    buffer: file.buffer,
    filename: file.originalname,
    mimeType: file.mimetype,
  });

  // 2) Track the row early so the dashboard can show "processing..." even
  //    if the AI call takes a while.
  const doc = await Document.create({
    userId,
    fileId,
    filename: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    status: 'pending',
  });

  // 3) Call Gemini. We do it inline (not background) for now because the
  //    current UX expects the result on the upload response. If we later
  //    want to support very large batches, this is the line to detach.
  try {
    const markdown = await extractClaim({ buffer: file.buffer, mimeType: file.mimetype });
    doc.markdown = markdown;
    doc.status = 'done';
    await doc.save();
  } catch (err) {
    doc.status = 'failed';
    doc.error = err.message?.slice(0, 500) || 'Extraction failed';
    await doc.save();
    // Re-throw so the controller returns an error to the user; the row
    // stays around in "failed" state for visibility/retry.
    throw new ApiError(502, 'AI extraction failed: ' + doc.error);
  }

  return doc;
};

export const listForUser = (userId) =>
  Document.find({ userId }).sort({ createdAt: -1 }).lean();

export const getOwnedDocument = async (userId, id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid id');
  const doc = await Document.findOne({ _id: id, userId });
  if (!doc) throw new ApiError(404, 'Document not found');
  return doc;
};

export const deleteOwnedDocument = async (userId, id) => {
  const doc = await getOwnedDocument(userId, id);
  await deleteFile(doc.fileId);
  await doc.deleteOne();
};

// --- Comparisons ---------------------------------------------------------

export const createComparison = async ({ userId, documentIds }) => {
  if (!Array.isArray(documentIds) || documentIds.length < 2) {
    throw new ApiError(400, 'Select at least two documents to compare');
  }
  if (documentIds.length > 5) {
    // Soft cap - more than ~5 docs blows up the prompt and degrades quality.
    throw new ApiError(400, 'Compare at most five documents at a time');
  }

  const docs = await Document.find({
    _id: { $in: documentIds },
    userId,
    status: 'done',
  });

  if (docs.length !== documentIds.length) {
    throw new ApiError(
      400,
      'Some documents are missing, not yours, or still processing',
    );
  }

  const comparison = await Comparison.create({
    userId,
    documentIds,
    status: 'pending',
  });

  try {
    const summary = await compareClaims(
      docs.map((d) => ({ filename: d.filename, markdown: d.markdown })),
    );
    comparison.aiSummary = summary;
    comparison.status = 'done';
    await comparison.save();
  } catch (err) {
    comparison.status = 'failed';
    comparison.error = err.message?.slice(0, 500) || 'Comparison failed';
    await comparison.save();
    throw new ApiError(502, 'AI comparison failed: ' + comparison.error);
  }

  return comparison;
};

export const listComparisons = (userId) =>
  Comparison.find({ userId })
    .sort({ createdAt: -1 })
    .populate('documentIds', 'filename status')
    .lean();

export const getOwnedComparison = async (userId, id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid id');
  const c = await Comparison.findOne({ _id: id, userId }).populate(
    'documentIds',
    'filename status createdAt',
  );
  if (!c) throw new ApiError(404, 'Comparison not found');
  return c;
};
