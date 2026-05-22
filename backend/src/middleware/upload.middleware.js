// middleware/upload.middleware.js
// Multer with memory storage. The buffer is later piped into GridFS by the
// storage service, so we don't want multer writing to disk first - that
// would double the I/O for a file we're going to forward as bytes anyway.
// Size cap is 10 MB to keep memory bounded; PDFs/images bigger than that
// for a single claim are unusual.

import multer from 'multer';
import ApiError from '../utils/ApiError.js';

const ACCEPTED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/webp',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (!ACCEPTED.has(file.mimetype)) {
      return cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

// Field name "file" matches the FormData key the frontend sends.
export const uploadSingle = upload.single('file');
