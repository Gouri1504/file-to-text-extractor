// services/groq.service.js
// Groq fallback using Llama 4 Scout via the OpenAI-compatible
// chat-completions endpoint. We deliberately avoid pulling in an SDK -
// the request shape is just JSON, and global fetch is available on Node
// 18+, so a thin wrapper keeps the dependency surface small.
//
// Capabilities and limits:
//   - Multimodal: text + images (JPEG/PNG/GIF/WebP). PDFs are NOT
//     accepted natively by Groq, so for PDF uploads we rasterize each
//     page to a JPEG via pdfRasterize.service first.
//   - Per-message image cap: Groq accepts at most ~5 image parts per
//     request. Multi-page PDFs are rendered up to that cap; if more
//     pages exist, we mark the result as truncated and prepend a
//     warning to the prompt so the model (and ultimately the user)
//     knows.
//   - Per-image size cap: ~4 MB. JPEGs from the rasterizer typically
//     come in well under that; raw image uploads from the user we
//     still validate explicitly.

import env from '../config/env.js';
import EXTRACT_CLAIM_PROMPT from '../prompts/extractClaim.prompt.js';
import buildComparePrompt from '../prompts/compareClaims.prompt.js';
import { rasterizePdf } from './pdfRasterize.service.js';

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Groq rejects base64 images larger than this; surface a friendly error
// before we even make the request so the user knows what to do.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const SUPPORTED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const callGroq = async (messages) => {
  if (!env.GROQ_API_KEY) {
    throw new Error('Groq fallback not configured (GROQ_API_KEY missing)');
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      messages,
      // Reasonable upper bound; Scout supports plenty more, but bigger
      // outputs slow the request and rarely improve extraction quality.
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    // Groq returns structured error JSON; fall back to status text if not.
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message || JSON.stringify(body);
    } catch {
      detail = await res.text();
    }
    throw new Error(`Groq API ${res.status}: ${detail}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text || !text.trim()) {
    throw new Error('Groq returned an empty response');
  }
  return text.trim();
};

// Builds the OpenAI-compatible "image_url" message part. Data URL form
// is the simplest way to send a base64 image without a separate upload.
const imagePart = (buffer, mimeType) => ({
  type: 'image_url',
  image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` },
});

export const extractClaim = async ({ buffer, mimeType }) => {
  // PDF path: rasterize to JPEGs and send each page as an image part.
  // The primary Gemini provider always tries the PDF directly first;
  // we only land here if Gemini already failed.
  if (mimeType === 'application/pdf') {
    const { images, totalPages, renderedPages, truncated } = await rasterizePdf(buffer);

    if (images.length === 0) {
      throw new Error('PDF rasterization produced no pages');
    }

    // Sanity-check each rendered page against Groq's per-image cap.
    // Almost never trips at our default JPEG quality, but a defensive
    // check beats an opaque 4xx from the API.
    for (let i = 0; i < images.length; i++) {
      if (images[i].length > MAX_IMAGE_BYTES) {
        throw new Error(
          `Rendered PDF page ${i + 1} too large for Groq (${(images[i].length / 1024 / 1024).toFixed(1)} MB > 4 MB)`,
        );
      }
    }

    // If we had to drop pages, tell the model so it can flag the issue
    // in the extracted markdown rather than silently miss data.
    const truncationNotice = truncated
      ? `\n\n[NOTE: This PDF has ${totalPages} pages but only the first ${renderedPages} were sent due to provider limits. If critical fields appear missing, the user should re-upload an image of the relevant page.]`
      : '';

    return callGroq([
      {
        role: 'user',
        content: [
          { type: 'text', text: EXTRACT_CLAIM_PROMPT + truncationNotice },
          ...images.map((img) => imagePart(img, 'image/jpeg')),
        ],
      },
    ]);
  }

  // Direct image path.
  if (!SUPPORTED_IMAGE_MIMES.has(mimeType)) {
    throw new Error(`Groq fallback does not support mimeType: ${mimeType}`);
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image too large for Groq fallback (${(buffer.length / 1024 / 1024).toFixed(1)} MB > 4 MB)`,
    );
  }

  return callGroq([
    {
      role: 'user',
      content: [
        { type: 'text', text: EXTRACT_CLAIM_PROMPT },
        imagePart(buffer, mimeType),
      ],
    },
  ]);
};

export const compareClaims = async (documents) =>
  callGroq([
    {
      role: 'user',
      content: buildComparePrompt(documents),
    },
  ]);
