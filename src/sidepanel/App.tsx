import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import type { FeatureId, TypographyReport, ContrastReport, GridReport, InspectInfo } from '@shared/types';
import { isMessage } from '@shared/messages';
import { FeatureToggle } from './components/FeatureToggle';
import { TypographyReportView } from './components/TypographyReport';
import { ContrastReportView } from './components/ContrastReport';
import { GridReportView } from './components/GridReport';
import { InspectReportView } from './components/InspectReport';

const MemoToggle = memo(FeatureToggle);

export function App() {
  const [features, setFeatures] = useState<Record<FeatureId, boolean>>({
    skeleton: false,
    typography: false,
    contrast: false,
    grid: false,
    inspect: false,
  });
  const [typoReport, setTypoReport] = useState<TypographyReport | null>(null);
  const [contrastReport, setContrastReport] = useState<ContrastReport | null>(null);
  const [gridReport, setGridReport] = useState<GridReport | null>(null);
  const [inspectInfo, setInspectInfo] = useState<InspectInfo | null>(null);

  // Inspect 업데이트를 rAF로 배칭하여 60fps → 1 render/frame으로 제한
  const pendingInspect = useRef<InspectInfo | null>(null);
  const inspectRaf = useRef(0);

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
        case 'INSPECT_REPORT':
          pendingInspect.current = message.data;
          if (!inspectRaf.current) {
            inspectRaf.current = requestAnimationFrame(() => {
              inspectRaf.current = 0;
              setInspectInfo(pendingInspect.current);
            });
          }
          break;
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => {
      chrome.runtime.onMessage.removeListener(handler);
      cancelAnimationFrame(inspectRaf.current);
    };
  }, []);

  const toggle = useCallback((feature: FeatureId) => {
    setFeatures((prev) => {
      const enabled = !prev[feature];
      chrome.runtime.sendMessage({ type: 'TOGGLE_FEATURE', feature, enabled });
      if (!enabled) {
        if (feature === 'typography') setTypoReport(null);
        if (feature === 'contrast') setContrastReport(null);
        if (feature === 'grid') setGridReport(null);
        if (feature === 'inspect') setInspectInfo(null);
      }
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
          label="Inspect"
          description="요소에 마우스를 올려 속성 확인"
          active={features.inspect}
          onToggle={() => toggle('inspect')}
        />
        {features.inspect && inspectInfo && (
          <InspectReportView info={inspectInfo} />
        )}
        {features.inspect && !inspectInfo && (
          <div class="report-empty">페이지에서 요소 위에 마우스를 올려보세요.</div>
        )}
      </section>

      <section class="panel-section">
        <MemoToggle
          label="Skeleton View"
          description="배경/이미지 제거, 여백 시각화"
          active={features.skeleton}
          onToggle={() => toggle('skeleton')}
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
