(function(){if(document.getElementById("rag-fab"))return;const t=document.createElement("style");t.textContent=`
    #rag-fab {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 2147483647;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #1a1a2e;
      color: #e0e0ff;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
    }
    #rag-fab:hover {
      transform: scale(1.1);
      background: #252547;
      box-shadow: 0 6px 28px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.12);
    }
    #rag-fab:active { transform: scale(0.96); }
    #rag-fab svg { pointer-events: none; }
  `,document.head.appendChild(t);const e=document.createElement("button");e.id="rag-fab",e.title="Open RAG Assistant",e.innerHTML=`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M20 2H4C2.9 2 2 2.9 2 4v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 12H6l-2 2V4h16v10z"/>
    </svg>
  `,e.addEventListener("click",()=>{try{chrome.runtime.sendMessage({type:"OPEN_PANEL"})}catch{e.remove(),document.getElementById("rag-fab-style")?.remove()}}),document.body.appendChild(e)})();
