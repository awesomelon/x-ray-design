import { useState, useEffect, useCallback } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { FeatureId, TypographyReport, ContrastReport, GridReport } from '@shared/types';
import { isMessage } from '@shared/messages';
import { FeatureToggle } from './components/FeatureToggle';
import { TypographyReportView } from './components/TypographyReport';
import { ContrastReportView } from './components/ContrastReport';
import { GridReportView } from './components/GridReport';

const MemoToggle = memo(FeatureToggle);

export function App() {
  const [features, setFeatures] = useState<Record<FeatureId, boolean>>({
    typography: false,
    contrast: false,
    grid: false,
    drag: false,
  });
  const [typoReport, setTypoReport] = useState<TypographyReport | null>(null);
  const [contrastReport, setContrastReport] = useState<ContrastReport | null>(null);
  const [gridReport, setGridReport] = useState<GridReport | null>(null);

  useEffect(() => {
    const handler = (message: unknown) => {
      if (!isMessage(message)) return;
      switch (message.type) {
        case 'FEATURE_STATE_CHANGED':
          setFeatures((prev) => ({ ...prev, [message.feature]: message.enabled }));
          break;
        case 'TYPOGRAPHY_REPORT':
          setTypoReport(message.data);
          break;
        case 'CONTRAST_REPORT':
          setContrastReport(message.data);
          break;
        case 'GRID_REPORT':
          setGridReport(message.data);
          break;
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const toggle = useCallback((feature: FeatureId) => {
    setFeatures((prev) => {
      const enabled = !prev[feature];
      queueMicrotask(() => {
        chrome.runtime.sendMessage({ type: 'TOGGLE_FEATURE', feature, enabled });
        if (!enabled) {
          if (feature === 'typography') setTypoReport(null);
          if (feature === 'contrast') setContrastReport(null);
          if (feature === 'grid') setGridReport(null);
        }
      });
      return { ...prev, [feature]: enabled };
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
          description="요소를 드래그하여 자유롭게 배치 (Esc: 리셋)"
          active={features.drag}
          onToggle={() => toggle('drag')}
        />
      </section>

      <section class="panel-section">
        <MemoToggle
          label="Grid Overlay"
          description="컬럼 그리드 + 베이스라인 격자"
          active={features.grid}
          onToggle={() => toggle('grid')}
        />
        {features.grid && gridReport && (
          <GridReportView report={gridReport} />
        )}
      </section>

      <section class="panel-section">
        <MemoToggle
          label="Typography Scale"
          description="폰트 크기 비율 분석"
          active={features.typography}
          onToggle={() => toggle('typography')}
        />
        {features.typography && typoReport && (
          <TypographyReportView report={typoReport} />
        )}
      </section>

      <section class="panel-section">
        <MemoToggle
          label="Contrast Ratio"
          description="WCAG 명도비 검증"
          active={features.contrast}
          onToggle={() => toggle('contrast')}
        />
        {features.contrast && contrastReport && (
          <ContrastReportView report={contrastReport} />
        )}
      </section>
    </div>
  );
}
