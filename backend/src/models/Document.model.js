// models/Document.model.js
// One row per uploaded claim document.
// `fileId` references the GridFS file (uploads.files._id), allowing us to
// stream the original back to the user later without re-running extraction.
// `status` tracks the async pipeline so the frontend can render pending vs
// done vs failed states. Markdown is stored inline because it's small text
// and reading it is the hot path (list view, detail view, comparisons).

import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number },
    markdown: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'done', 'failed'],
      default: 'pending',
      index: true,
    },
    error: { type: String },
  },
  { timestamps: true },
);

// Compound index for the dashboard query "my docs, newest first".
documentSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Document', documentSchema);
