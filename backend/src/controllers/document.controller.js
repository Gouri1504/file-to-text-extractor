// controllers/document.controller.js
// HTTP <-> document.service translator. The upload handler is the most
// interesting: multer parses the multipart body into req.file, then we
// delegate the whole pipeline to the service.

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import {
  createAndExtract,
  listForUser,
  getOwnedDocument,
  deleteOwnedDocument,
} from '../services/document.service.js';
import { openDownloadStream } from '../services/storage.service.js';

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'No file uploaded (field name must be "file")');
  const doc = await createAndExtract({ userId: req.user._id, file: req.file });
  return new ApiResponse(201, { document: doc }, 'Document processed').send(res);
});

export const listDocuments = asyncHandler(async (req, res) => {
  const docs = await listForUser(req.user._id);
  return new ApiResponse(200, { documents: docs }, 'OK').send(res);
});

export const getDocument = asyncHandler(async (req, res) => {
  const doc = await getOwnedDocument(req.user._id, req.params.id);
  return new ApiResponse(200, { document: doc }, 'OK').send(res);
});

export const deleteDocument = asyncHandler(async (req, res) => {
  await deleteOwnedDocument(req.user._id, req.params.id);
  return new ApiResponse(200, null, 'Deleted').send(res);
});

// Stream the original file back. Used by the "Download original" button
// on the detail page. We never load the whole buffer into memory - the
// GridFS stream is piped straight into the response.
export const downloadFile = asyncHandler(async (req, res) => {
  const doc = await getOwnedDocument(req.user._id, req.params.id);
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
  const stream = openDownloadStream(doc.fileId);
  stream.on('error', () => res.status(404).end('File not found'));
  stream.pipe(res);
});
