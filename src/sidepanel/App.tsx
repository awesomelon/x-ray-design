import { useState, useEffect, useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { FeatureId, GridReport } from '@shared/types';
import { isMessage } from '@shared/messages';
import { FeatureToggle } from './components/FeatureToggle';
import { DragGridConfig } from './components/DragGridConfig';

const MemoToggle = memo(FeatureToggle);

export function App() {
  const [dragEnabled, setDragEnabled] = useState(false);
  const [gridReport, setGridReport] = useState<GridReport | null>(null);

  useEffect(() => {
    const handler = (message: unknown) => {
      if (!isMessage(message)) return;
      switch (message.type) {
        case 'FEATURE_STATE_CHANGED':
          if (message.feature === 'drag') {
            setDragEnabled(message.enabled);
            if (!message.enabled) setGridReport(null);
          }
          break;
        case 'GRID_REPORT':
          setGridReport(message.data);
          break;
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const toggle = useCallback(() => {
    setDragEnabled((prev) => {
      const enabled = !prev;
      queueMicrotask(() => {
        chrome.runtime.sendMessage({
          type: 'TOGGLE_FEATURE',
          feature: 'drag' as FeatureId,
          enabled,
        });
      });
      if (!enabled) setGridReport(null);
      return enabled;
    });
  }, []);

  return (
    <div class="panel">
      <header class="panel-header">
        <h1>X-Ray Design</h1>
      </header>

      <section class="panel-section">
        <MemoToggle
          label="Element Drag"
          description="요소를 드래그하여 배치. 클릭 후 방향키로 미세 조정 (Esc: 리셋)"
          active={dragEnabled}
          onToggle={toggle}
        />
        {dragEnabled && gridReport && <DragGridConfig report={gridReport} />}
      </section>
    </div>
  );
}
