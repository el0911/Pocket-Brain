import * as webllm from "@mlc-ai/web-llm";
import { DEFAULT_LLM_MODEL } from "../utils/config.js";

// ─── State ────────────────────────────────────────────────────────────────────
let engine = null;
let currentModel = DEFAULT_LLM_MODEL;

// ─── LLM init ─────────────────────────────────────────────────────────────────
async function initLLM(modelId, onProgress) {
  if (engine && currentModel === modelId) return;
  console.log("[RAG] Loading LLM:", modelId);
  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (p) => {
      onProgress?.({ type: "llm-progress", text: p.text, progress: p.progress });
    },
  });
  currentModel = modelId;
  console.log("[RAG] LLM ready:", modelId);
}

// ─── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg, sender).then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true;
});

async function handleMessage(msg, sender) {
  switch (msg.type) {
    case "OPEN_PANEL": {
      chrome.sidePanel.open({ tabId: sender.tab.id });
      return { ok: true };
    }
    default:
      return { error: "Unknown message type" };
  }
}

// ─── Streaming port ───────────────────────────────────────────────────────────
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "rag-stream") return;

  port.onMessage.addListener(async (msg) => {

    // ── Load / switch model ──
    if (msg.type === "LOAD_MODEL") {
      try {
        await initLLM(msg.modelId, (p) => port.postMessage(p));
        port.postMessage({ type: "llm-ready", modelId: msg.modelId });
      } catch (e) {
        port.postMessage({ type: "error", error: e.message });
      }
    }

    // ── Stream a RAG answer ──
    // The sidebar sends the already-retrieved context chunks as `context`
    if (msg.type === "STREAM_QUERY") {
      try {
        const { prompt, modelId } = msg;

        if (!engine || currentModel !== modelId) {
          port.postMessage({ type: "llm-progress", text: "Loading model…", progress: 0 });
          await initLLM(modelId, (p) => port.postMessage(p));
        }

        const stream = await engine.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) port.postMessage({ type: "token", token: delta });
        }

        port.postMessage({ type: "done" });
      } catch (e) {
        port.postMessage({ type: "error", error: e.message });
      }
    }
  });
});
