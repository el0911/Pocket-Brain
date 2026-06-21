import { pipeline } from "@xenova/transformers";
import { EMBEDDING_MODEL, CHUNK_SIZE, IDB_NAME, IDB_STORE } from "../utils/config.js";

let embedder = null;

async function getEmbedder() {
  if (embedder) return embedder;
  embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
  return embedder;
}

export async function embedText(text) {
  const model = await getEmbedder();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export async function saveData(text) {
  const model = await getEmbedder();

  // Chunk
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const piece = text.slice(i, i + CHUNK_SIZE).trim();
    if (piece.length > 0) chunks.push({ id: `chunk_${Date.now()}_${chunks.length}`, text: piece });
  }

  // Embed
  const records = [];
  for (const chunk of chunks) {
    const output = await model(chunk.text, { pooling: "mean", normalize: true });
    records.push({ id: chunk.id, text: chunk.text, embedding: Array.from(output.data) });
  }

  // Save to IndexedDB
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    for (const r of records) store.put(r);
  });
  db.close();

  return { chunks: records.length };
}

export async function loadAllChunks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      resolve(req.result.map(r => ({
        ...r,
        embedding: r.embedding instanceof Float32Array ? r.embedding : new Float32Array(r.embedding)
      })));
    };
  });
}

export async function getChunkCount() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).count();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db.close(); resolve(req.result); };
  });
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(IDB_STORE)) {
        d.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
  });
}
