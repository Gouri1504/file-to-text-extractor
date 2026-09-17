// controllers/chat.controller.js
// HTTP <-> chat.service. Body is validated by the route's Zod schema.

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import env from '../config/env.js';
import { ask } from '../services/chat.service.js';

export const askQuestion = asyncHandler(async (req, res) => {
  if (!env.RAG_ENABLED) {
    throw new ApiError(503, 'Document Q&A is not configured on this server');
  }
  const { question, documentIds } = req.body;
  const result = await ask({ userId: req.user._id, question, documentIds });
  return new ApiResponse(200, result, 'OK').send(res);
});
