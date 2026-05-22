// api/document.api.js
// Wrappers for /api/documents. The upload helper uses FormData because the
// backend expects multipart/form-data with a single "file" field.

import client, { unwrap } from './client.js';

export const apiListDocuments = () => unwrap(client.get('/documents'));

export const apiGetDocument = (id) => unwrap(client.get(`/documents/${id}`));

export const apiDeleteDocument = (id) => unwrap(client.delete(`/documents/${id}`));

export const apiUploadDocument = (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  return unwrap(
    client.post('/documents', form, {
      // Note: don't set Content-Type manually - axios + the browser fill in
      // the multipart boundary correctly only when we leave it alone.
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    }),
  );
};

// Returns a URL that the browser can navigate to / use as <a download>.
// Auth cookie rides along automatically because of same-origin / credentials.
export const documentFileUrl = (id) => {
  const base = import.meta.env.VITE_API_URL || '/api';
  return `${base}/documents/${id}/file`;
};
