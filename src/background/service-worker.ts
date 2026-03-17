import { isMessage } from '../shared/messages';

let cachedTabId: number | undefined;

chrome.tabs.onActivated.addListener((info) => {
  cachedTabId = info.tabId;
});
chrome.windows.onFocusChanged.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    cachedTabId = tabs[0]?.id;
  });
});

function sendToActiveTab(message: unknown): void {
  if (cachedTabId) {
    chrome.tabs.sendMessage(cachedTabId, message).catch(() => {});
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    cachedTabId = tabs[0]?.id;
    if (cachedTabId) {
      chrome.tabs.sendMessage(cachedTabId, message).catch(() => {});
    }
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    cachedTabId = tab.id;
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isMessage(message)) return;

  if (message.type === 'TOGGLE_FEATURE' || message.type === 'UPDATE_GRID_SETTINGS' || message.type === 'SET_GRID_VISIBLE') {
    sendToActiveTab(message);
  }

  if (message.type === 'CONTENT_READY' || message.type === 'FEATURE_STATE_CHANGED' || message.type === 'GRID_REPORT') {
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  sendResponse({ ok: true });
  return true;
});
