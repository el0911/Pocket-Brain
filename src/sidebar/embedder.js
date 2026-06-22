import { pipeline } from "@xenova/transformers";
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { EMBEDDING_MODEL, CHUNK_SIZE, IDB_NAME, IDB_STORE, DEFAULT_LLM_MODEL } from "../utils/config.js";

// ─── Embedding ────────────────────────────────────────────────────────────────
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

// ─── LLM ─────────────────────────────────────────────────────────────────────
let engine = null;
let currentModelId = null;

export async function loadModel(modelId, onProgress) {
  if (engine && currentModelId === modelId) return;
  engine = await CreateMLCEngine(modelId, {
    initProgressCallback: (p) => onProgress?.(p),
  });
  currentModelId = modelId;
}

export async function streamAnswer(prompt, onToken, onDone, onError) {
  if (!engine) { onError("No model loaded"); return; }
  try {
    const stream = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? "";
      if (delta) onToken(delta);
    }
    onDone();
  } catch (e) {
    onError(e.message);
  }
}

// ─── IndexedDB ────────────────────────────────────────────────────────────────
let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const probe = indexedDB.open(IDB_NAME);
    probe.onerror = () => reject(probe.error);
    probe.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(IDB_STORE, { keyPath: "id" });
    };
    probe.onsuccess = () => {
      const db = probe.result;
      if (db.objectStoreNames.contains(IDB_STORE)) {
        dbInstance = db;
        resolve(db);
      } else {
        const nextVersion = db.version + 1;
        db.close();
        const upgrade = indexedDB.open(IDB_NAME, nextVersion);
        upgrade.onerror = () => reject(upgrade.error);
        upgrade.onupgradeneeded = (e) => {
          e.target.result.createObjectStore(IDB_STORE, { keyPath: "id" });
        };
        upgrade.onsuccess = () => { dbInstance = upgrade.result; resolve(dbInstance); };
      }
    };
  });
}

export async function saveData(text) {
  const model = await getEmbedder();
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const piece = text.slice(i, i + CHUNK_SIZE).trim();
    if (piece.length > 0) chunks.push({ id: `chunk_${Date.now()}_${chunks.length}`, text: piece });
  }
  const records = [];
  for (const chunk of chunks) {
    const output = await model(chunk.text, { pooling: "mean", normalize: true });
    records.push({ id: chunk.id, text: chunk.text, embedding: Array.from(output.data) });
  }
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    for (const r of records) tx.objectStore(IDB_STORE).put(r);
  });
  return { chunks: records.length };
}

export async function loadAllChunks() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      resolve(req.result.map(r => ({
        ...r,
        embedding: r.embedding instanceof Float32Array ? r.embedding : new Float32Array(r.embedding),
      })));
    };
  });
}

export async function getChunkCount() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).count();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  } catch { return 0; }
}
