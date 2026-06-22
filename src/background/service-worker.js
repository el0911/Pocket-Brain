// Minimal service worker — just handles opening the side panel.
// All heavy lifting (embedding + LLM) runs in the sidebar page.

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_PANEL") {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ ok: true });
  }
  return true;
});
