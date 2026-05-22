// services/gemini.service.js
// Wraps every Gemini API call. Two operations:
//   - extractClaim(buffer, mimeType): runs the extraction prompt against a
//     PDF or image buffer. Gemini accepts PDFs natively as inlineData with
//     mimeType "application/pdf", so we no longer need pdfjs-dist to render
//     pages to images first - that whole pipeline (previously in the React
//     component) is gone.
//   - compareClaims(documents): runs the comparison prompt over already-
//     extracted markdown. This is text-only - much faster and cheaper than
//     re-sending the original images.

import { getModel } from '../config/gemini.js';
import EXTRACT_CLAIM_PROMPT from '../prompts/extractClaim.prompt.js';
import buildComparePrompt from '../prompts/compareClaims.prompt.js';

export const extractClaim = async ({ buffer, mimeType }) => {
  const model = getModel();
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: EXTRACT_CLAIM_PROMPT },
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType,
            },
          },
        ],
      },
    ],
  });

  const text = result.response.text();
  if (!text || !text.trim()) {
    throw new Error('Gemini returned an empty response');
  }
  return text.trim();
};

export const compareClaims = async (documents) => {
  const model = getModel();
  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: buildComparePrompt(documents) }],
      },
    ],
  });

  const text = result.response.text();
  if (!text || !text.trim()) {
    throw new Error('Gemini returned an empty comparison');
  }
  return text.trim();
};
