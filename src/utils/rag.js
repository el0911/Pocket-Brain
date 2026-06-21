import { TOP_K } from "./config.js";

/**
 * Compute cosine similarity between two Float32Arrays.
 */
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Retrieve the top-k most relevant chunks for a given query embedding.
 *
 * @param {Float32Array} queryEmbedding
 * @param {Array<{ id, text, embedding: Float32Array }>} chunks
 * @param {number} k
 * @returns {Array<{ id, text, score }>}
 */
export function retrieveTopK(queryEmbedding, chunks, k = TOP_K) {
  const scored = chunks.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

/**
 * Build a RAG prompt from retrieved chunks + the user query.
 */
export function buildPrompt(query, chunks) {
  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.text.trim()}`)
    .join("\n\n");

  return `You are a helpful assistant. Answer the user's question using ONLY the context below.
If the answer isn't in the context, say you don't have enough information.

CONTEXT:
${context}

QUESTION: ${query}

ANSWER:`;
}
