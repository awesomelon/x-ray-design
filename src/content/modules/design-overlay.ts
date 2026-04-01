import { getOverlayRoot } from '../overlay-host';
import { isMessage, swallowDisconnect } from '@shared/messages';
import type { OverlaySettings } from '@shared/types';

const STORAGE_KEY_PREFIX = 'overlay_image_';
const SETTINGS_KEY_PREFIX = 'overlay_settings_';

let imgEl: HTMLImageElement | null = null;
let containerEl: HTMLDivElement | null = null;
let tabId: number | null = null;
let scrollHandler: (() => void) | null = null;

const defaults: OverlaySettings = {
  opacity: 50,
  x: 0,
  y: 0,
  scale: 100,
  blend: 'normal',
  scroll: 'fixed',
};

let currentSettings: OverlaySettings = { ...defaults };

function storageKey(): string {
  return `${STORAGE_KEY_PREFIX}${tabId ?? 'unknown'}`;
}

function settingsKey(): string {
  return `${SETTINGS_KEY_PREFIX}${tabId ?? 'unknown'}`;
}

function clampSettings(s: OverlaySettings): OverlaySettings {
  return {
    opacity: Math.max(0, Math.min(100, s.opacity || 0)),
    x: Number.isFinite(s.x) ? s.x : 0,
    y: Number.isFinite(s.y) ? s.y : 0,
    scale: Math.max(10, Math.min(500, s.scale || 100)),
    blend: s.blend === 'difference' ? 'difference' : 'normal',
    scroll: s.scroll === 'scroll' ? 'scroll' : 'fixed',
  };
}

function applySettings(): void {
  if (!imgEl || !containerEl) return;

  const s = currentSettings;
  imgEl.style.opacity = String(s.opacity / 100);
  imgEl.style.mixBlendMode = s.blend;
  containerEl.style.left = `${s.x}px`;
  containerEl.style.top = `${s.y}px`;

  if (s.scale !== 100) {
    imgEl.style.transform = `scale(${s.scale / 100})`;
    imgEl.style.transformOrigin = 'top left';
  } else {
    imgEl.style.transform = '';
  }

  // Scroll mode: use translateY to follow page scroll
  if (s.scroll === 'scroll') {
    containerEl.style.transform = `translateY(${-window.scrollY}px)`;
    if (!scrollHandler) {
      scrollHandler = () => {
        if (containerEl && currentSettings.scroll === 'scroll') {
          containerEl.style.transform = `translateY(${-window.scrollY}px)`;
        }
      };
      window.addEventListener('scroll', scrollHandler, { passive: true });
    }
  } else {
    containerEl.style.transform = '';
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
      scrollHandler = null;
    }
  }
}

function showImage(dataUrl: string): void {
  const root = getOverlayRoot();

  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.id = 'xray-design-overlay';
    containerEl.style.cssText =
      'position:fixed;top:0;left:0;pointer-events:none;z-index:0;';
    // Insert as the first child so it's behind all other layers
    root.insertBefore(containerEl, root.firstChild?.nextSibling ?? null);
  }

  if (!imgEl) {
    imgEl = document.createElement('img');
    imgEl.style.cssText = 'display:block;pointer-events:none;max-width:none;';
    containerEl.appendChild(imgEl);
  }

  imgEl.src = dataUrl;
  applySettings();
}

function clearOverlay(): void {
  if (containerEl) {
    containerEl.remove();
    containerEl = null;
    imgEl = null;
  }
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
  currentSettings = { ...defaults };
  if (tabId != null) {
    chrome.storage.local.remove(storageKey()).catch(() => {});
  }
}

function handleFitToViewport(): void {
  if (!imgEl) return;

  const vw = window.innerWidth;
  const imgW = imgEl.naturalWidth;
  if (imgW === 0) return;

  const fitScale = Math.round((vw / imgW) * 100);
  const result = { scale: fitScale, x: 0, y: 0 };

  currentSettings.scale = result.scale;
  currentSettings.x = result.x;
  currentSettings.y = result.y;
  applySettings();
  persistSettings();

  chrome.runtime.sendMessage({
    type: 'OVERLAY_FIT_RESULT',
    ...result,
  }).catch(swallowDisconnect);
}

function persistSettings(): void {
  chrome.storage.local.set({ [settingsKey()]: currentSettings }).catch(() => {});
}

function onMessage(message: unknown): void {
  if (!isMessage(message)) return;

  switch (message.type) {
    case 'OVERLAY_SETTINGS_UPDATE': {
      Object.assign(currentSettings, message.settings);
      currentSettings = clampSettings(currentSettings);
      applySettings();
      persistSettings();
      break;
    }
    case 'OVERLAY_CLEAR':
      clearOverlay();
      break;
    case 'OVERLAY_FIT_TO_VIEWPORT':
      handleFitToViewport();
      break;
  }
}

function onStorageChanged(
  changes: { [key: string]: chrome.storage.StorageChange },
): void {
  const key = storageKey();
  if (changes[key]?.newValue) {
    showImage(changes[key].newValue as string);
  }
}

async function resolveTabId(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_TAB_ID' }, (response) => {
      if (response?.tabId) tabId = response.tabId;
      resolve();
    });
  });
}

async function restoreState(): Promise<void> {
  const imgKey = storageKey();
  const setKey = settingsKey();
  const data = await chrome.storage.local.get([imgKey, setKey]);
  if (data[setKey]) {
    currentSettings = clampSettings({ ...defaults, ...data[setKey] });
  }
  if (data[imgKey]) {
    showImage(data[imgKey] as string);
  }
}

export async function activateOverlay(): Promise<void> {
  await resolveTabId();
  await restoreState();
  chrome.runtime.onMessage.addListener(onMessage);
  chrome.storage.onChanged.addListener(onStorageChanged);
}

export function deactivateOverlay(): void {
  chrome.runtime.onMessage.removeListener(onMessage);
  chrome.storage.onChanged.removeListener(onStorageChanged);
  if (containerEl) {
    containerEl.remove();
    containerEl = null;
    imgEl = null;
  }
  if (scrollHandler) {
    window.removeEventListener('scroll', scrollHandler);
    scrollHandler = null;
  }
}
