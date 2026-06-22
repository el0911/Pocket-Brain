import { useState, useEffect, useRef, useCallback } from "react";
import { LLM_MODELS, DEFAULT_LLM_MODEL, TOP_K } from "../utils/config.js";
import { embedText, saveData, loadAllChunks, getChunkCount, loadModel, streamAnswer } from "./embedder.js";
import { retrieveTopK, buildPrompt } from "../utils/rag.js";

const css = `
  :root {
    --bg: #0f0f1a; --surface: #16162a; --surface2: #1e1e35;
    --border: rgba(255,255,255,0.08); --accent: #7c6af7;
    --accent-dim: rgba(124,106,247,0.18); --text: #e8e8f0;
    --text-dim: #8888aa; --user-bg: #1e1e35; --bot-bg: #131325;
    --error: #f07070; --success: #70d4a8;
    --radius: 12px; --radius-sm: 8px;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; line-height: 1.6; }
  .app { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }

  .header { display: flex; align-items: center; gap: 10px; padding: 14px 16px 12px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .header-icon { width: 32px; height: 32px; border-radius: 50%; background: var(--accent-dim); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
  .header-title { font-size: 15px; font-weight: 600; color: var(--text); flex: 1; }
  .header-subtitle { font-size: 11px; color: var(--text-dim); }

  .tabs { display: flex; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .tab { flex: 1; padding: 12px; background: none; border: none; color: var(--text-dim); font-size: 13px; font-family: var(--font); cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

  .model-bar { padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .model-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 6px; }
  .model-select-row { display: flex; gap: 8px; align-items: center; }
  .model-select { flex: 1; background: var(--surface2); color: var(--text); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 7px 10px; font-size: 13px; font-family: var(--font); cursor: pointer; outline: none; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='%238888aa'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 10px center; padding-right: 28px; }
  .model-select:focus { border-color: var(--accent); }
  .load-btn { background: var(--accent); color: #fff; border: none; border-radius: var(--radius-sm); padding: 7px 14px; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; }
  .load-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .load-btn:hover:not(:disabled) { opacity: 0.88; }

  .status-bar { padding: 7px 16px; font-size: 12px; color: var(--text-dim); background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 8px; flex-shrink: 0; min-height: 34px; }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .status-dot.ready { background: var(--success); }
  .status-dot.loading { background: var(--accent); animation: pulse 1s infinite; }
  .status-dot.error { background: var(--error); }
  .status-dot.idle { background: var(--text-dim); }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .progress-bar { flex: 1; height: 3px; background: var(--surface2); border-radius: 99px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.3s ease; }

  .messages { flex: 1; overflow-y: auto; padding: 16px 12px; display: flex; flex-direction: column; gap: 12px; scroll-behavior: smooth; }
  .messages::-webkit-scrollbar { width: 4px; }
  .messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  .empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-dim); gap: 10px; text-align: center; padding: 32px; }
  .empty-icon { width: 48px; height: 48px; border-radius: 50%; background: var(--accent-dim); display: flex; align-items: center; justify-content: center; color: var(--accent); }
  .empty-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .empty-body { font-size: 13px; color: var(--text-dim); max-width: 220px; }

  .msg { display: flex; flex-direction: column; gap: 4px; }
  .msg-role { font-size: 10px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-dim); padding: 0 4px; }
  .msg.user .msg-role { text-align: right; color: var(--accent); }
  .msg-bubble { padding: 10px 13px; border-radius: var(--radius); font-size: 13.5px; line-height: 1.65; white-space: pre-wrap; word-break: break-word; }
  .msg.user .msg-bubble { background: var(--user-bg); border: 1px solid var(--border); margin-left: 24px; border-bottom-right-radius: 4px; }
  .msg.assistant .msg-bubble { background: var(--bot-bg); border: 1px solid var(--border); margin-right: 24px; border-bottom-left-radius: 4px; }
  .msg.error .msg-bubble { background: rgba(240,112,112,0.08); border-color: rgba(240,112,112,0.25); color: var(--error); }
  .cursor { display: inline-block; width: 2px; height: 14px; background: var(--accent); margin-left: 2px; vertical-align: middle; animation: blink 0.8s step-end infinite; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

  .sources { margin-top: 6px; margin-right: 24px; }
  .sources-toggle { background: none; border: none; color: var(--text-dim); font-size: 11px; cursor: pointer; padding: 2px 4px; display: flex; align-items: center; gap: 4px; }
  .sources-toggle:hover { color: var(--text); }
  .sources-list { margin-top: 6px; display: flex; flex-direction: column; gap: 5px; }
  .source-chip { background: var(--surface2); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; font-size: 11.5px; color: var(--text-dim); }
  .source-score { color: var(--accent); font-weight: 600; margin-right: 6px; }

  .input-area { padding: 12px 12px 14px; background: var(--surface); border-top: 1px solid var(--border); flex-shrink: 0; }
  .input-row { display: flex; gap: 8px; align-items: flex-end; }
  .input-box { flex: 1; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font); font-size: 13.5px; line-height: 1.5; padding: 9px 12px; resize: none; outline: none; min-height: 42px; max-height: 120px; transition: border-color 0.15s; }
  .input-box:focus { border-color: var(--accent); }
  .input-box::placeholder { color: var(--text-dim); }
  .send-btn { width: 42px; height: 42px; border-radius: 50%; background: var(--accent); border: none; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: opacity 0.15s, transform 0.12s; }
  .send-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.06); }
  .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .hint { font-size: 11px; color: var(--text-dim); margin-top: 6px; text-align: center; }

  .data-panel { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .data-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-dim); margin-bottom: 4px; }
  .data-textarea { width: 100%; min-height: 180px; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font); font-size: 13px; line-height: 1.6; padding: 10px 12px; resize: vertical; outline: none; }
  .data-textarea:focus { border-color: var(--accent); }
  .data-textarea::placeholder { color: var(--text-dim); }
  .save-btn { width: 100%; padding: 11px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 14px; font-weight: 600; cursor: pointer; font-family: var(--font); transition: opacity 0.15s; }
  .save-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .save-btn:hover:not(:disabled) { opacity: 0.88; }
  .data-status { padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; background: var(--surface2); border: 1px solid var(--border); color: var(--text-dim); }
  .data-status.success { border-color: var(--success); color: var(--success); background: rgba(112,212,168,0.06); }
  .data-status.error { border-color: var(--error); color: var(--error); background: rgba(240,112,112,0.06); }
  .chunk-count { font-size: 12px; color: var(--text-dim); text-align: center; }
`;
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
  </svg>
);

function Sources({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  return (
    <div className="sources">
      <button className="sources-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "▾" : "▸"} {sources.length} source{sources.length !== 1 ? "s" : ""} used
      </button>
      {open && (
        <div className="sources-list">
          {sources.map((s, i) => (
            <div key={i} className="source-chip">
              <span className="source-score">{(s.score * 100).toFixed(0)}%</span>{s.text}…
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ msg }) {
  return (
    <div className={`msg ${msg.role}`}>
      <div className="msg-role">{msg.role === "user" ? "You" : "Assistant"}</div>
      <div className="msg-bubble">
        {msg.content}
        {msg.streaming && <span className="cursor" />}
      </div>
      {msg.sources && <Sources sources={msg.sources} />}
    </div>
  );
}

function DataTab() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [dataStatus, setDataStatus] = useState(null);
  const [chunkCount, setChunkCount] = useState(null);

  useEffect(() => {
    getChunkCount().then(setChunkCount).catch(() => setChunkCount(0));
  }, []);

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setDataStatus({ state: "loading", text: "Embedding… this may take a moment" });
    try {
      const { chunks } = await saveData(text.trim());
      const total = await getChunkCount();
      setChunkCount(total);
      setDataStatus({ state: "success", text: `✓ Saved ${chunks} chunks (${total} total)` });
      setText("");
    } catch (e) {
      setDataStatus({ state: "error", text: `Error: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="data-panel">
      <div>
        <div className="data-label">Paste your data</div>
        <textarea
          className="data-textarea"
          placeholder="Paste any text — docs, notes, articles. It will be chunked and embedded automatically."
          value={text}
          onChange={e => setText(e.target.value)}
          disabled={saving}
        />
      </div>
      {text.trim() && (
        <div className="chunk-count">~{Math.ceil(text.trim().length / 500)} chunks will be created</div>
      )}
      <button className="save-btn" onClick={handleSave} disabled={saving || !text.trim()}>
        {saving ? "Embedding & saving…" : "Save to Vector DB"}
      </button>
      {dataStatus && <div className={`data-status ${dataStatus.state}`}>{dataStatus.text}</div>}
      {chunkCount !== null && (
        <div className="chunk-count">{chunkCount} chunk{chunkCount !== 1 ? "s" : ""} in vector DB</div>
      )}
    </div>
  );
}

function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(DEFAULT_LLM_MODEL);
  const [loadedModel, setLoadedModel] = useState(null);
  const [status, setStatus] = useState({ state: "idle", text: "Select a model to begin" });
  const [loadProgress, setLoadProgress] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chunkCount, setChunkCount] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    getChunkCount().then(count => {
      setChunkCount(count);
      setStatus({ state: "idle", text: `${count} chunks ready · Select a model` });
    }).catch(() => {});
  }, []);

  const handleLoadModel = useCallback(async () => {
    setStatus({ state: "loading", text: "Loading model…" });
    setLoadProgress(0);
    try {
      await loadModel(selectedModel, (p) => {
        setStatus({ state: "loading", text: p.text });
        setLoadProgress(Math.round((p.progress ?? 0) * 100));
      });
      setLoadedModel(selectedModel);
      setLoadProgress(100);
      const label = LLM_MODELS.find(m => m.id === selectedModel)?.label ?? selectedModel;
      setStatus({ state: "ready", text: `${label} · ${chunkCount ?? "?"} chunks` });
    } catch (e) {
      setStatus({ state: "error", text: `Error: ${e.message}` });
    }
  }, [selectedModel, chunkCount]);

  const handleSend = useCallback(async () => {
    const query = input.trim();
    if (!query || isStreaming || !loadedModel) return;
    setInput("");
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: "user", content: query }]);

    const assistantId = Date.now();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true, sources: null }]);

    try {
      const queryEmbedding = new Float32Array(await embedText(query));
      const allChunks = await loadAllChunks();
      const topChunks = retrieveTopK(queryEmbedding, allChunks, TOP_K);
      const prompt = buildPrompt(query, topChunks);

      setMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m, sources: topChunks.map(c => ({ id: c.id, score: c.score, text: c.text.slice(0, 120) }))
      } : m));

      await streamAnswer(
        prompt,
        (token) => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + token } : m)),
        () => { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m)); setIsStreaming(false); },
        (err) => { setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, role: "error", content: `Error: ${err}`, streaming: false } : m)); setIsStreaming(false); }
      );
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, role: "error", content: `Error: ${e.message}`, streaming: false } : m));
      setIsStreaming(false);
    }
  }, [input, isStreaming, loadedModel]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <>
      <div className="model-bar">
        <div className="model-label">LLM Model</div>
        <div className="model-select-row">
          <select className="model-select" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={isStreaming}>
            {LLM_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button className="load-btn" onClick={handleLoadModel} disabled={isStreaming || (selectedModel === loadedModel && loadedModel !== null)}>
            {loadedModel === null ? "Load" : selectedModel !== loadedModel ? "Switch" : "Loaded ✓"}
          </button>
        </div>
      </div>

      <div className="status-bar">
        <span className={`status-dot ${status.state}`} />
        <span style={{ flex: 1, fontSize: 12, color: "var(--text-dim)" }}>{status.text}</span>
        {status.state === "loading" && (
          <div className="progress-bar" style={{ width: 80 }}>
            <div className="progress-fill" style={{ width: `${loadProgress}%` }} />
          </div>
        )}
      </div>

      <div className="messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><ChatIcon /></div>
            <div className="empty-title">Ask your knowledge base</div>
            <div className="empty-body">Add data in the Data tab, load a model, then ask anything.</div>
          </div>
        ) : messages.map((msg, i) => <Message key={msg.id ?? i} msg={msg} />)}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <div className="input-row">
          <textarea
            className="input-box"
            placeholder={!loadedModel ? "Load a model first…" : isStreaming ? "Generating…" : "Ask something…"}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!loadedModel || isStreaming}
            rows={1}
          />
          <button className="send-btn" onClick={handleSend} disabled={!loadedModel || isStreaming || !input.trim()}>
            <SendIcon />
          </button>
        </div>
        <div className="hint">Enter to send · Shift+Enter for new line</div>
      </div>
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState("chat");
  return (
    <div className="app">
      <div className="header">
        <div className="header-icon"><ChatIcon /></div>
        <div>
          <div className="header-title">Pocket Brain</div>
          <div className="header-subtitle">On-device · Private</div>
        </div>
      </div>
      <div className="tabs">
        <button className={`tab ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>💬 Chat</button>
        <button className={`tab ${tab === "data" ? "active" : ""}`} onClick={() => setTab("data")}>📂 Data</button>
      </div>
      {tab === "chat" ? <ChatTab /> : <DataTab />}
    </div>
  );
}
