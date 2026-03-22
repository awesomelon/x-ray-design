import { isMessage, swallowDisconnect } from '../shared/messages';

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
    chrome.tabs.sendMessage(cachedTabId, message).catch(swallowDisconnect);
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    cachedTabId = tabs[0]?.id;
    if (cachedTabId) {
      chrome.tabs.sendMessage(cachedTabId, message).catch(swallowDisconnect);
    }
  });
}

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    cachedTabId = tab.id;
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isMessage(message)) return;
  const fromContentScript = !!sender.tab;

  if (message.type === 'TOGGLE_FEATURE') {
    sendToActiveTab(message);
  }

  if (fromContentScript && (message.type === 'CONTENT_READY' || message.type === 'FEATURE_STATE_CHANGED')) {
    chrome.runtime.sendMessage(message).catch(swallowDisconnect);
  }

  sendResponse({ ok: true });
  return true;
});
