// controllers/comparison.controller.js
// HTTP <-> document.service comparison helpers.

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import {
  createComparison,
  listComparisons,
  getOwnedComparison,
} from '../services/document.service.js';

export const create = asyncHandler(async (req, res) => {
  const comparison = await createComparison({
    userId: req.user._id,
    documentIds: req.body.documentIds,
  });
  return new ApiResponse(201, { comparison }, 'Comparison generated').send(res);
});

export const list = asyncHandler(async (req, res) => {
  const comparisons = await listComparisons(req.user._id);
  return new ApiResponse(200, { comparisons }, 'OK').send(res);
});

export const getOne = asyncHandler(async (req, res) => {
  const comparison = await getOwnedComparison(req.user._id, req.params.id);
  return new ApiResponse(200, { comparison }, 'OK').send(res);
});
