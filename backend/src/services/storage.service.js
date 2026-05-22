// services/storage.service.js
// Thin wrapper around GridFSBucket so the rest of the app never sees raw
// streams. We expose three operations:
//   - putBuffer: store a Buffer (from multer.memoryStorage), return fileId.
//   - openDownloadStream: get a Readable for a stored file (used by the
//     "/documents/:id/file" endpoint to stream the original back).
//   - deleteFile: remove file + its chunks (called when a Document row is
//     deleted, to keep DB tidy).

import { Readable } from 'stream';
import mongoose from 'mongoose';
import { getBucket } from '../config/db.js';

export const putBuffer = ({ buffer, filename, mimeType }) =>
  // Wrapped in a Promise so callers can `await` the resulting fileId rather
  // than work with the underlying event-emitter API.
  new Promise((resolve, reject) => {
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimeType,
      metadata: { mimeType },
    });

    Readable.from(buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id));
  });

export const openDownloadStream = (fileId) => {
  const bucket = getBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

export const deleteFile = async (fileId) => {
  const bucket = getBucket();
  try {
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
  } catch (err) {
    // Tolerate "file not found" - it can race with manual cleanup, and we
    // don't want one missing GridFS row to block a Document delete.
    if (!/file not found/i.test(err.message)) throw err;
  }
};
