import { IDB_NAME, IDB_STORE } from "./config.js";

/**
 * Open the RAG IndexedDB database (read-only).
 * The DB must already exist and be populated with chunks.
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

/**
 * Load all chunks from IndexedDB.
 * Each chunk should have the shape: { id, text, embedding }
 * embedding can be a plain Array or Float32Array.
 *
 * @returns {Promise<Array<{ id: string, text: string, embedding: Float32Array }>>}
 */
export async function loadChunks() {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.getAll();

    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const rows = req.result;
      // Normalise embeddings to Float32Array regardless of how they were stored
      const chunks = rows.map((row) => ({
        id: row.id,
        text: row.text,
        embedding:
          row.embedding instanceof Float32Array
            ? row.embedding
            : new Float32Array(row.embedding),
      }));
      resolve(chunks);
    };
  });
}
