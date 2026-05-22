// prompts/compareClaims.prompt.js
// Builds the prompt for AI-powered multi-document comparison.
// We feed the AI the already-extracted markdown from each document (not the
// raw images), because the extraction step has already turned visual chaos
// into structured data. That's faster, cheaper, and more reliable than
// asking the AI to re-read images and compare in one shot.

const buildComparePrompt = (documents) => {
  const sections = documents
    .map(
      (doc, i) => `### DOCUMENT ${i + 1} - ${doc.filename}\n\n${doc.markdown || '(empty)'}\n`,
    )
    .join('\n---\n\n');

  return `
You are a senior medical insurance claims auditor. You will be given the
extracted contents of ${documents.length} medical claim documents. Compare
them and produce a structured markdown report.

IMPORTANT INSTRUCTIONS:
1. DO NOT include introductory or concluding text.
2. Start DIRECTLY with the first header below.
3. Use proper markdown formatting (headers, lists, tables).
4. Be specific - cite values from the documents (e.g. "Document 1: \u20B91000 vs Document 2: \u20B91500").
5. Where data is missing in a document, say so explicitly.

Produce these sections in order:

## Overview
A 2-3 sentence summary of what kind of documents these are and at a high
level how they relate (same patient? same hospital? same insurer?).

## Side-by-Side Key Fields
| Field | ${documents.map((_, i) => `Doc ${i + 1}`).join(' | ')} |
${'|---'.repeat(documents.length + 1)}|
Rows: Patient Name, Claim Number, Date of Claim, Hospital, Diagnosis,
Total Billed, Amount Claimed, Amount Approved, Status.

## Similarities
Bullet list of fields that match across the documents.

## Differences
Bullet list of fields that differ, with the differing values called out.

## Anomalies / Red Flags
Anything suspicious: large unexplained billing differences, inconsistent
patient details for what appears to be the same person, missing critical
fields, etc. If none, write "None detected".

## Recommendation
A 2-3 sentence professional recommendation: approve, escalate, or request
clarification - and why.

Documents to compare follow.

${sections}
`.trim();
};

export default buildComparePrompt;
