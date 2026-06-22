# 🧠 Pocket Brain

> Your personal AI that knows exactly what you tell it — and nothing else.

Pocket Brain is a Chrome extension that lets you build a private, on-device knowledge base and chat with it using large language models — all without a server, API key, or internet connection after setup. Your data never leaves your machine.

---

## How It Works

Pocket Brain uses a **RAG (Retrieval-Augmented Generation)** pipeline running entirely inside your browser:

```
You paste text
      ↓
Chunked into 500-char pieces
      ↓
Embedded into vectors (Transformers.js)
      ↓
Saved to IndexedDB inside the extension
      ↓
You ask a question
      ↓
Question gets embedded → cosine similarity search → top chunks retrieved
      ↓
Chunks + question sent as prompt to WebLLM
      ↓
Answer streamed back to you
```

No cloud. No API calls. No tracking. Just your brain in your pocket.

---

## Features

- 💬 **Chat UI** — clean, streaming chat interface with source citations
- 📂 **Data tab** — paste any text and save it to your vector DB in one click
- 🔄 **Switchable LLM models** — choose from Llama, Phi, Gemma, Mistral, Qwen and more
- 🔍 **RAG pipeline** — cosine similarity search over your saved chunks
- 🔒 **Fully private** — everything runs locally, nothing is sent to any server
- ⚡ **WebGPU accelerated** — fast inference via WebLLM's MLC engine
- 🧩 **Floating button** — accessible from every page via a chat bubble (bottom-right)
- 📎 **Source panel** — every answer shows which chunks it used and their similarity scores

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension framework | Chrome MV3 |
| UI | React 18 + Vite |
| LLM inference | [@mlc-ai/web-llm](https://webllm.mlc.ai/) via WebGPU |
| Embeddings | [@xenova/transformers](https://huggingface.co/docs/transformers.js) |
| Embedding model | `Xenova/all-MiniLM-L6-v2` |
| Vector storage | IndexedDB (inside extension origin) |
| Similarity search | Cosine similarity (pure JS) |

---

## Project Structure

```
pocket-brain/
├── public/
│   └── manifest.json            # Chrome extension manifest (MV3)
├── src/
│   ├── background/
│   │   └── service-worker.js    # LLM inference via WebLLM
│   ├── content/
│   │   └── index.js             # Injects floating chat button on every page
│   ├── sidebar/
│   │   ├── index.html           # Side panel entry point
│   │   ├── main.jsx             # React root
│   │   ├── App.jsx              # Chat UI + Data tab
│   │   └── embedder.js          # Transformers.js embedding + IndexedDB
│   └── utils/
│       ├── config.js            # Models, DB names, chunk size
│       ├── db.js                # IndexedDB helpers
│       └── rag.js               # Cosine similarity + prompt builder
├── vite.config.js               # Multi-entry Vite build for Chrome
└── package.json
```

---

## Architecture Decisions

### Why split embedding and inference?

Chrome MV3 service workers block `Atomics.wait`, which `@xenova/transformers` relies on internally. So:

- **Sidebar** (normal extension page) → runs Transformers.js for embedding. No restrictions.
- **Service worker** → runs WebLLM for LLM inference only. Stays lean.

### Why IndexedDB inside the extension?

Content scripts share the host page's IndexedDB origin, but the service worker runs under `chrome-extension://` — a completely separate origin. By doing all DB work in the sidebar (same origin as the service worker's extension context), reads and writes are consistent across the whole extension.

### Why cosine similarity in pure JS?

No dependencies, no WASM, no setup. For typical knowledge bases (hundreds to low thousands of chunks) it's fast enough. If you scale to tens of thousands of chunks, swap it for an HNSW index.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Chrome 113+ (WebGPU support required)
- A GPU helps — integrated graphics work but dedicated is faster

### Install & Build

```bash
git clone https://github.com/yourname/pocket-brain
cd pocket-brain
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

The chat bubble will appear in the bottom-right corner of every page.

### Development (watch mode)

```bash
npm run dev
```

Vite watches for changes and rebuilds `dist/` automatically. After each rebuild, go to `chrome://extensions` and click the refresh icon on the Pocket Brain card.

---

## Usage

### Adding data

1. Click the **chat bubble** on any page to open the side panel
2. Go to the **📂 Data** tab
3. Paste any text — docs, notes, articles, transcripts, anything
4. Click **Save to Vector DB**
5. The text is chunked, embedded, and stored locally — you'll see the chunk count update

You can add data multiple times — each save appends to the existing DB.

### Chatting

1. Go to the **💬 Chat** tab
2. Select a model from the dropdown and click **Load**
   - First load downloads the model weights from WebLLM's CDN (~1.5–5GB depending on model)
   - After the first download, models are cached and load instantly
3. Ask anything — Pocket Brain searches your saved chunks and uses the most relevant ones to answer

### Switching models

Pick a different model from the dropdown and click **Switch**. The new model downloads and replaces the old one in memory. Your vector DB is unaffected.

---

## Available Models

| Model | Size | Best for |
|---|---|---|
| Llama 3.2 3B | ~2GB | Fast responses, everyday queries |
| Llama 3.1 8B | ~5GB | Smarter, more detailed answers |
| Phi 3.5 Mini | ~2GB | Efficient, good reasoning |
| Gemma 2 2B | ~1.5GB | Lightest option, fastest load |
| Mistral 7B | ~4GB | Balanced performance |
| Qwen 2.5 7B | ~4GB | Strong multilingual support |

---

## Configuration

All key settings live in `src/utils/config.js`:

```js
// Embedding model — must stay consistent with your saved vectors
export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

// IndexedDB settings
export const IDB_NAME  = "vectorDB";
export const IDB_STORE = "vectors";

// RAG settings
export const CHUNK_SIZE = 500;  // characters per chunk
export const TOP_K      = 5;    // chunks retrieved per query

// Available LLM models shown in the UI
export const LLM_MODELS = [ ... ];
```

> ⚠️ If you change `EMBEDDING_MODEL`, you must clear your IndexedDB and re-embed all your data. The query embedding and stored embeddings must come from the same model or similarity scores will be meaningless.

---

## Limitations

- **First model load is slow** — model weights are large (1.5–5GB). After caching, subsequent loads are fast.
- **WebGPU required** — Chrome 113+ on a machine with a GPU. Doesn't work on older browsers or CPU-only environments.
- **No persistence between extension reloads** — the in-memory chunk cache reloads from IndexedDB on each session, which is fast.
- **Chunk size is naive** — splits at exactly 500 chars regardless of sentence boundaries. Works fine in practice but could be smarter.

---

## Roadmap

- [ ] Clear / reset vector DB from the UI
- [ ] Upload files (PDF, txt) directly in the Data tab
- [ ] Smarter chunking (sentence-aware splitting)
- [ ] Multiple knowledge bases / namespaces
- [ ] Export and import your vector DB
- [ ] HNSW index for large knowledge bases

---

## License

MIT — do whatever you want with it.

---

*Built with WebLLM, Transformers.js, React, and a healthy distrust of cloud services.*
