// models/Comparison.model.js
// AI-generated comparisons across two or more of a user's documents.
// We persist the AI summary so opening a past comparison is free (no second
// Gemini call). documentIds is a small array - we don't expect users to
// compare more than a handful at once.

import mongoose from 'mongoose';

const comparisonSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
      },
    ],
    aiSummary: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'done', 'failed'],
      default: 'pending',
    },
    error: { type: String },
  },
  { timestamps: true },
);

comparisonSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Comparison', comparisonSchema);
