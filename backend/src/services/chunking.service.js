// services/chunking.service.js
// Splits extracted markdown into small, overlapping chunks for embedding.
// MiniLM only reads the first ~256 tokens of its input, so chunks are kept
// to ~800 characters. We split on headings first so each chunk knows which
// section it came from - that section label is what citations show.

const MAX_CHARS = 800;
const OVERLAP_CHARS = 120;

const HEADING_RE = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

// Groups lines under their nearest heading. The label is the heading path
// ("Patient Details › Address") so nested sections stay distinguishable.
const splitSections = (markdown) => {
  const sections = [];
  const stack = [];
  let current = { section: '', lines: [] };

  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(HEADING_RE);
    if (m) {
      if (current.lines.some((l) => l.trim())) sections.push(current);
      const level = m[1].length;
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      stack.push({ level, title: m[2].replace(/[*_`]/g, '') });
      current = { section: stack.map((s) => s.title).join(' › '), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((l) => l.trim())) sections.push(current);
  return sections;
};

// Breaks a block that is too long by lines first (keeps table rows whole),
// then by characters as a last resort.
const splitOversized = (block) => {
  if (block.length <= MAX_CHARS) return [block];
  const pieces = [];
  let buf = '';
  for (const line of block.split('\n')) {
    if (line.length > MAX_CHARS) {
      if (buf) pieces.push(buf);
      buf = '';
      for (let i = 0; i < line.length; i += MAX_CHARS) pieces.push(line.slice(i, i + MAX_CHARS));
    } else if (buf && buf.length + line.length + 1 > MAX_CHARS) {
      pieces.push(buf);
      buf = line;
    } else {
      buf = buf ? `${buf}\n${line}` : line;
    }
  }
  if (buf) pieces.push(buf);
  return pieces;
};

// Last ~OVERLAP_CHARS of a chunk, cut at a line boundary when possible (so
// table rows stay whole), otherwise at a word boundary.
const tail = (text) => {
  if (text.length <= OVERLAP_CHARS) return text;
  const slice = text.slice(-OVERLAP_CHARS);
  const newline = slice.indexOf('\n');
  if (newline !== -1) return slice.slice(newline + 1);
  const space = slice.indexOf(' ');
  return space === -1 ? slice : slice.slice(space + 1);
};

export const chunkMarkdown = (markdown) => {
  if (!markdown || !markdown.trim()) return [];

  const chunks = [];
  for (const { section, lines } of splitSections(markdown)) {
    const blocks = lines
      .join('\n')
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean)
      .flatMap(splitOversized);

    let buf = '';
    for (const block of blocks) {
      if (buf && buf.length + block.length + 2 > MAX_CHARS) {
        chunks.push({ section, text: buf });
        const overlap = tail(buf);
        // Only carry overlap if it still leaves room for the next block.
        buf = overlap.length + block.length + 2 <= MAX_CHARS ? `${overlap}\n\n${block}` : block;
      } else {
        buf = buf ? `${buf}\n\n${block}` : block;
      }
    }
    if (buf) chunks.push({ section, text: buf });
  }

  return chunks.map((c, index) => ({ ...c, index }));
};
