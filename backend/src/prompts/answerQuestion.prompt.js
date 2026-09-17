// prompts/answerQuestion.prompt.js
// Grounded Q&A prompt for "ask your documents". The retrieved chunks are
// numbered [1]..[n]; the model must answer only from them and cite those
// numbers inline so the UI can link each claim back to its source.

export const NOT_FOUND_ANSWER = "I couldn't find this in your documents.";

const buildAnswerPrompt = (question, sources) => {
  const context = sources
    .map((s, i) => {
      const where = s.section ? `${s.filename} › ${s.section}` : s.filename;
      return `[${i + 1}] (${where})\n${s.text}`;
    })
    .join('\n\n---\n\n');

  return `
You are an assistant answering questions about a user's medical claim
documents. Answer using ONLY the numbered sources below.

RULES:
1. Every factual statement must end with the number(s) of the source(s)
   that support it, in square brackets, e.g. "The claim amount is ₹5,000 [2]."
   Use only numbers that appear in the sources list.
2. If the sources do not contain the answer, reply exactly:
   "${NOT_FOUND_ANSWER}"
3. Do not use outside knowledge or guess. Quote values (amounts, dates,
   names, IDs) exactly as they appear.
4. If sources conflict, say so and cite each one.
5. Be concise. Use markdown (short lists or a small table) when it helps.
   No introduction or closing remarks.

SOURCES:

${context}

QUESTION: ${question}
`.trim();
};

export default buildAnswerPrompt;
