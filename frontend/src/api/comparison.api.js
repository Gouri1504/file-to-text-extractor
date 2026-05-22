// api/comparison.api.js
// Wrappers for /api/comparisons.

import client, { unwrap } from './client.js';

export const apiListComparisons = () => unwrap(client.get('/comparisons'));

export const apiGetComparison = (id) => unwrap(client.get(`/comparisons/${id}`));

export const apiCreateComparison = (documentIds) =>
  unwrap(client.post('/comparisons', { documentIds }));
