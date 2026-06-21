import { pipeline } from "@xenova/transformers";
import { EMBEDDING_MODEL } from "../utils/config.js";

let embedder = null;

export async function getEmbedder() {
  if (embedder) return embedder;
  embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
  return embedder;
}

export async function embedText(text) {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}
