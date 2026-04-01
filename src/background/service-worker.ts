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
  // Handle GET_TAB_ID from content scripts (not a Message type)
  if (message && typeof message === 'object' && message.type === 'GET_TAB_ID') {
    sendResponse({ tabId: sender.tab?.id ?? null });
    return true;
  }

  if (!isMessage(message)) return;
  const fromContentScript = !!sender.tab;

  if (message.type === 'TOGGLE_FEATURE') {
    sendToActiveTab(message);
  }

  // Forward overlay messages from side panel to active tab (not from content scripts)
  if (!fromContentScript && (
    message.type === 'OVERLAY_SETTINGS_UPDATE' ||
    message.type === 'OVERLAY_CLEAR' ||
    message.type === 'OVERLAY_FIT_TO_VIEWPORT')) {
    sendToActiveTab(message);
  }

  // Forward fit result from content script to side panel
  if (fromContentScript && message.type === 'OVERLAY_FIT_RESULT') {
    chrome.runtime.sendMessage(message).catch(swallowDisconnect);
  }

  if (fromContentScript && (message.type === 'CONTENT_READY' || message.type === 'FEATURE_STATE_CHANGED')) {
    chrome.runtime.sendMessage(message).catch(swallowDisconnect);
  }

  sendResponse({ ok: true });
  return true;
});
