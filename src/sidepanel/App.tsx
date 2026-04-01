import { useState, useEffect, useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { FeatureId } from '@shared/types';
import { isMessage } from '@shared/messages';
import { FeatureToggle } from './components/FeatureToggle';
import { OverlaySection } from './sections/OverlaySection';

const MemoToggle = memo(FeatureToggle);

export function App() {
  const [dragEnabled, setDragEnabled] = useState(false);
  const [cssEditorEnabled, setCssEditorEnabled] = useState(false);
  const [overlayEnabled, setOverlayEnabled] = useState(false);

  useEffect(() => {
    const handler = (message: unknown) => {
      if (!isMessage(message)) return;
      switch (message.type) {
        case 'CONTENT_READY':
          setDragEnabled(false);
          setCssEditorEnabled(false);
          setOverlayEnabled(false);
          break;
        case 'FEATURE_STATE_CHANGED':
          if (message.feature === 'drag') setDragEnabled(message.enabled);
          if (message.feature === 'css-editor') setCssEditorEnabled(message.enabled);
          if (message.feature === 'overlay') setOverlayEnabled(message.enabled);
          break;
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const toggleFeature = useCallback((feature: FeatureId, setter: (fn: (prev: boolean) => boolean) => void) => {
    setter((prev) => {
      const enabled = !prev;
      queueMicrotask(() => {
        chrome.runtime.sendMessage({ type: 'TOGGLE_FEATURE', feature, enabled });
      });
      return enabled;
    });
  }, []);

  const toggleDrag = useCallback(() => toggleFeature('drag', setDragEnabled), [toggleFeature]);
  const toggleCssEditor = useCallback(() => toggleFeature('css-editor', setCssEditorEnabled), [toggleFeature]);
  const toggleOverlay = useCallback(() => toggleFeature('overlay', setOverlayEnabled), [toggleFeature]);

  const anyActive = dragEnabled || cssEditorEnabled || overlayEnabled;

  return (
    <div class="panel">
      <header class="panel-header">
        <h1>Snap {anyActive && <span class="status-badge">Active</span>}</h1>
      </header>

      <section class="panel-section">
        <MemoToggle
          label="Element Drag"
          description="요소를 드래그하여 배치. 클릭 후 방향키로 미세 조정 (Esc: 리셋)"
          active={dragEnabled}
          onToggle={toggleDrag}
        />
        {!dragEnabled && (
          <p class="onboarding-hint">
            ON을 누르면 페이지 요소를 자유롭게 드래그할 수 있습니다. 주변 요소에 자동으로 스냅됩니다.
          </p>
        )}
      </section>

      <section class="panel-section">
        <MemoToggle
          label="CSS Editor"
          description="요소를 선택하면 CSS 속성을 인라인으로 수정할 수 있습니다."
          active={cssEditorEnabled}
          onToggle={toggleCssEditor}
        />
      </section>

      <section class="panel-section">
        <MemoToggle
          label="Design Overlay"
          description="디자인 이미지를 웹페이지 위에 반투명으로 겹쳐 비교합니다."
          active={overlayEnabled}
          onToggle={toggleOverlay}
        />
        <OverlaySection active={overlayEnabled} />
      </section>
    </div>
  );
}
