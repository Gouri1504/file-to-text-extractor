// services/ai.service.js
// Provider orchestrator. The rest of the codebase calls THIS file, never
// the individual provider services - so adding/removing providers in the
// future is a one-file change. Today: Gemini primary, Groq fallback.
//
// The fallback fires for any error from Gemini (network blip, quota,
// 5xx, malformed response). We deliberately don't try to classify which
// errors are "retryable" vs not - if Gemini fails for any reason and a
// fallback is configured, we try it. Worst case we waste one extra call;
// best case the user's request goes through.

import env from '../config/env.js';
import * as gemini from './gemini.service.js';
import * as groq from './groq.service.js';

// Returns the result of the primary provider, or the fallback's result
// if the primary throws. Logs both errors when both fail. The thrown
// error includes both messages so the user gets actionable feedback.
const withFallback = async ({ label, primary, fallback }) => {
  try {
    return await primary();
  } catch (primaryErr) {
    if (!fallback) throw primaryErr;
    console.warn(`[ai] ${label}: Gemini failed, trying Groq fallback. Reason: ${primaryErr.message}`);
    try {
      const result = await fallback();
      console.log(`[ai] ${label}: Groq fallback succeeded`);
      return result;
    } catch (fallbackErr) {
      console.error(`[ai] ${label}: both providers failed`, {
        gemini: primaryErr.message,
        groq: fallbackErr.message,
      });
      // Combine messages so the controller's 502 error is informative.
      const combined = new Error(
        `Primary (Gemini) failed: ${primaryErr.message}. ` +
          `Fallback (Groq) also failed: ${fallbackErr.message}`,
      );
      throw combined;
    }
  }
};

export const extractClaim = ({ buffer, mimeType }) =>
  withFallback({
    label: 'extractClaim',
    primary: () => gemini.extractClaim({ buffer, mimeType }),
    fallback: env.GROQ_FALLBACK_ENABLED
      ? () => groq.extractClaim({ buffer, mimeType })
      : null,
  });

export const compareClaims = (documents) =>
  withFallback({
    label: 'compareClaims',
    primary: () => gemini.compareClaims(documents),
    fallback: env.GROQ_FALLBACK_ENABLED ? () => groq.compareClaims(documents) : null,
  });
