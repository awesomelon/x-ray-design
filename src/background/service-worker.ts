import { isMessage } from '../shared/messages';

// 활성 탭 ID 캐시 — 탭 변경 시에만 갱신
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

  if (message.type === 'TOGGLE_FEATURE' || message.type === 'REQUEST_REPORT' || message.type === 'UPDATE_GRID_SETTINGS') {
    sendToActiveTab(message);
  } else {
    chrome.runtime.sendMessage(message).catch(() => {});
  }

  sendResponse({ ok: true });
  return true;
});
