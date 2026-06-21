// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// Swap EMBEDDING_MODEL only if you re-generate your IndexedDB vectors with a
// different model. The query embedding MUST match the stored embeddings.
// ─────────────────────────────────────────────────────────────────────────────

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

// IndexedDB settings — must match whatever DB your embeddings were saved into
export const IDB_NAME = "vectorDB";
export const IDB_STORE = "vectors"; // Each record: { id, text, embedding: Float32Array }

// Top-k chunks to retrieve per query
export const TOP_K = 5;
export const CHUNK_SIZE = 500;

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABLE LLM MODELS (from WebLLM's CDN)
// Add or remove models here — they appear in the UI model switcher.
// ─────────────────────────────────────────────────────────────────────────────
export const LLM_MODELS = [
  {
    id: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    label: "Llama 3.2 3B (fast, ~2GB)",
  },
  {
    id: "Llama-3.1-8B-Instruct-q4f32_1-MLC",
    label: "Llama 3.1 8B (smart, ~5GB)",
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    label: "Phi 3.5 Mini (compact, ~2GB)",
  },
  {
    id: "gemma-2-2b-it-q4f32_1-MLC",
    label: "Gemma 2 2B (Google, ~1.5GB)",
  },
  {
    id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC",
    label: "Mistral 7B (balanced, ~4GB)",
  },
  {
    id: "Qwen2.5-7B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 7B (multilingual, ~4GB)",
  },
];

export const DEFAULT_LLM_MODEL = LLM_MODELS[0].id;
