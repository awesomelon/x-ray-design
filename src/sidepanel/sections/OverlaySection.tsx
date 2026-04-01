import { useState, useCallback, useRef } from 'preact/hooks';
import type { OverlaySettings } from '@shared/types';
import { swallowDisconnect } from '@shared/messages';

interface Props {
  active: boolean;
}

const defaults: OverlaySettings = {
  opacity: 50,
  x: 0,
  y: 0,
  scale: 100,
  blend: 'normal',
  scroll: 'fixed',
};

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function OverlaySection({ active }: Readonly<Props>) {
  const [settings, setSettings] = useState<OverlaySettings>({ ...defaults });
  const [hasImage, setHasImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendSettings = useCallback((partial: Partial<OverlaySettings>) => {
    chrome.runtime.sendMessage({
      type: 'OVERLAY_SETTINGS_UPDATE',
      settings: partial,
    }).catch(swallowDisconnect);
  }, []);

  const loadImage = useCallback(async (file: File) => {
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('PNG, JPG, WebP 이미지만 지원합니다.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('이미지가 너무 큽니다 (최대 5MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      // Get the current active tab to scope storage
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.storage.local.set({ [`overlay_image_${tab.id}`]: dataUrl });
      }
      setHasImage(true);
      setSettings({ ...defaults });
    };
    reader.onerror = () => setError('이미지를 읽을 수 없습니다.');
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files[0];
    if (file) loadImage(file);
  }, [loadImage]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) loadImage(file);
    input.value = '';
  }, [loadImage]);

  const handleClear = useCallback(async () => {
    chrome.runtime.sendMessage({ type: 'OVERLAY_CLEAR' }).catch(swallowDisconnect);
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.storage.local.remove(`overlay_image_${tab.id}`);
    }
    setHasImage(false);
    setSettings({ ...defaults });
    setError(null);
  }, []);

  const handleFit = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'OVERLAY_FIT_TO_VIEWPORT' }).catch(swallowDisconnect);
    const handler = (msg: unknown) => {
      if (msg && typeof msg === 'object' && 'type' in msg &&
          (msg as { type: string }).type === 'OVERLAY_FIT_RESULT') {
        const result = msg as unknown as { scale: number; x: number; y: number };
        setSettings(prev => ({ ...prev, scale: result.scale, x: result.x, y: result.y }));
        chrome.runtime.onMessage.removeListener(handler);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    // Clean up listener after 5s timeout to prevent leak
    setTimeout(() => chrome.runtime.onMessage.removeListener(handler), 5000);
  }, []);

  const updateSetting = useCallback(<K extends keyof OverlaySettings>(
    key: K,
    value: OverlaySettings[K],
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    sendSettings({ [key]: value });
  }, [sendSettings]);

  if (!active) return null;

  return (
    <div class="overlay-section">
      {!hasImage ? (
        <div
          class={`overlay-dropzone ${isDragOver ? 'overlay-dropzone--active' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <span class="overlay-dropzone__icon">+</span>
          <span class="overlay-dropzone__text">디자인 이미지를 드롭하세요</span>
          <span class="overlay-dropzone__hint">PNG, JPG, WebP (최대 5MB)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style="display:none"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div class="overlay-controls">
          <div class="overlay-control-row">
            <label>Opacity</label>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.opacity}
              onInput={(e) => updateSetting('opacity', Number((e.target as HTMLInputElement).value))}
            />
            <span class="overlay-value">{settings.opacity}%</span>
          </div>

          <div class="overlay-control-row">
            <label>Scale</label>
            <input
              type="number"
              value={settings.scale}
              min="10"
              max="500"
              step="5"
              onChange={(e) => updateSetting('scale', Number((e.target as HTMLInputElement).value))}
            />
            <span class="overlay-value">%</span>
          </div>

          <div class="overlay-control-row">
            <label>X</label>
            <input
              type="number"
              value={settings.x}
              step="1"
              onChange={(e) => updateSetting('x', Number((e.target as HTMLInputElement).value))}
            />
            <label style="margin-left:8px">Y</label>
            <input
              type="number"
              value={settings.y}
              step="1"
              onChange={(e) => updateSetting('y', Number((e.target as HTMLInputElement).value))}
            />
          </div>

          <div class="overlay-control-row">
            <label>Blend</label>
            <select
              value={settings.blend}
              onChange={(e) => updateSetting('blend', (e.target as HTMLSelectElement).value as 'normal' | 'difference')}
            >
              <option value="normal">Normal</option>
              <option value="difference">Difference</option>
            </select>
          </div>

          <div class="overlay-control-row">
            <label>Scroll</label>
            <select
              value={settings.scroll}
              onChange={(e) => updateSetting('scroll', (e.target as HTMLSelectElement).value as 'fixed' | 'scroll')}
            >
              <option value="fixed">Fixed</option>
              <option value="scroll">Scroll</option>
            </select>
          </div>

          <div class="overlay-actions">
            <button class="overlay-btn" onClick={handleFit}>맞추기</button>
            <button class="overlay-btn overlay-btn--danger" onClick={handleClear}>제거</button>
          </div>

          <p class="overlay-hint">2x Retina? Scale을 50%로 설정하세요</p>
        </div>
      )}

      {error && <p class="overlay-error">{error}</p>}
    </div>
  );
}
