// services/pdfRasterize.service.js
// Server-side PDF -> JPEG-per-page renderer used ONLY by the Groq
// fallback. The primary Gemini path takes PDFs natively, so this code
// never runs in the happy path - it's quota/error insurance.
//
// Implementation notes:
//   - pdfjs-dist v4 is the legacy/CJS-friendly line; we use the
//     "legacy" build because it doesn't require a DOM and runs cleanly
//     on Node. (v5 is ESM-only and changes a lot of internals.)
//   - pdf.js needs a 2D canvas to render to. In a browser that's the
//     HTML <canvas> element; in Node we use @napi-rs/canvas, the
//     mainstream native canvas binding. Prebuilt binaries ship with
//     the package, so no compile step is needed at install time.
//   - We render JPEG (not PNG) at quality 0.85 because Groq caps each
//     image at ~4 MB, and a typical claim PDF page at scale 2.0 in PNG
//     can blow past that. JPEG at 0.85 stays well under the cap with
//     no perceptible loss for OCR.

import { createCanvas } from '@napi-rs/canvas';

// Use the legacy build for Node (no DOM dependencies). Dynamic import so
// any pdfjs-internal warnings don't blow up other modules' import-time.
const loadPdfjs = async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // pdf.js wants a worker for parallelism. In Node we don't have Web
  // Workers, and document parsing is fast enough on the main thread, so
  // we disable the worker explicitly.
  pdfjs.GlobalWorkerOptions.workerSrc = '';
  return pdfjs;
};

const DEFAULT_OPTIONS = {
  scale: 2.0, // matches the original frontend's quality setting
  jpegQuality: 0.85,
  maxPages: 5, // Groq accepts at most 5 image parts per request
};

// Returns { images: Buffer[], totalPages, renderedPages, truncated }
export const rasterizePdf = async (pdfBuffer, options = {}) => {
  const { scale, jpegQuality, maxPages } = { ...DEFAULT_OPTIONS, ...options };
  const pdfjs = await loadPdfjs();

  // pdf.js mutates the input Uint8Array, so hand it a fresh copy. Without
  // this, the same Buffer can't be re-read later (e.g. for retries).
  const data = new Uint8Array(pdfBuffer);

  const loadingTask = pdfjs.getDocument({
    data,
    // Suppress "fake worker" warnings from showing up as errors when we
    // intentionally run worker-less.
    disableFontFace: true,
    useSystemFonts: false,
    // pdf.js historically warned about missing standard font data; this
    // path lets it find them inside the installed package.
    standardFontDataUrl: new URL(
      './node_modules/pdfjs-dist/standard_fonts/',
      `file://${process.cwd()}/`,
    ).href,
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const renderedPages = Math.min(totalPages, maxPages);
  const images = [];

  for (let pageNum = 1; pageNum <= renderedPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const ctx = canvas.getContext('2d');

    await page.render({
      // @napi-rs/canvas's context is API-compatible with the browser
      // CanvasRenderingContext2D that pdf.js expects.
      canvasContext: ctx,
      viewport,
    }).promise;

    images.push(canvas.toBuffer('image/jpeg', jpegQuality));

    // Free per-page resources eagerly. Long PDFs would otherwise pile up
    // page objects in memory until the loop ends.
    page.cleanup();
  }

  // Final cleanup of the document-level cache.
  await pdf.destroy();

  return {
    images,
    totalPages,
    renderedPages,
    truncated: totalPages > renderedPages,
  };
};
