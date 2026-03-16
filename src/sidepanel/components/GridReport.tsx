import { useState, useEffect, useRef } from 'preact/hooks';
import type { GridReport, GridSettings } from '@shared/types';

interface Props {
  report: GridReport;
}

function toSettings(report: GridReport): GridSettings {
  return {
    columns: report.columns,
    gutterWidth: report.gutterWidth,
    containerMaxWidth: report.containerMaxWidth,
    marginLeft: report.marginLeft,
    marginRight: report.marginRight,
    baselineHeight: report.baselineHeight,
  };
}

export function GridReportView({ report }: Readonly<Props>) {
  const [settings, setSettings] = useState<GridSettings>(toSettings(report));

  // 자동 감지 결과가 들어오면 동기화
  useEffect(() => {
    setSettings(toSettings(report));
  }, [report]);

  // 입력 디바운스: 150ms 뒤 메시지 전송
  const sendTimer = useRef<ReturnType<typeof setTimeout>>();
  const update = (patch: Partial<GridSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    clearTimeout(sendTimer.current);
    sendTimer.current = setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'UPDATE_GRID_SETTINGS', data: next });
    }, 150);
  };

  const numField = (
    label: string,
    value: number | null,
    onChange: (v: number) => void,
    opts?: { min?: number; max?: number; step?: number; nullable?: boolean }
  ) => (
    <div class="grid-field">
      <label class="grid-field__label">{label}</label>
      <input
        class="grid-field__input"
        type="number"
        value={value ?? ''}
        min={opts?.min ?? 0}
        max={opts?.max}
        step={opts?.step ?? 1}
        onInput={(e) => {
          const v = parseFloat((e.target as HTMLInputElement).value);
          if (!isNaN(v)) onChange(v);
        }}
      />
    </div>
  );

  // columnWidth는 다른 값에서 자동 계산
  const contentWidth = settings.containerMaxWidth
    ?? (window.innerWidth - settings.marginLeft - settings.marginRight);
  const totalGutters = (settings.columns - 1) * settings.gutterWidth;
  const columnWidth = settings.columns > 0
    ? Math.round((contentWidth - totalGutters) / settings.columns)
    : 0;

  return (
    <div class="report">
      <div class="grid-fields">
        {numField('Columns', settings.columns, (v) => update({ columns: v }), { min: 1, max: 24 })}
        {numField('Gutter', settings.gutterWidth, (v) => update({ gutterWidth: v }), { min: 0 })}
        {numField('Max Width', settings.containerMaxWidth, (v) => update({ containerMaxWidth: v }), { min: 0 })}
        {numField('Margin L', settings.marginLeft, (v) => update({ marginLeft: v }), { min: 0 })}
        {numField('Margin R', settings.marginRight, (v) => update({ marginRight: v }), { min: 0 })}
        {numField('Baseline', settings.baselineHeight, (v) => update({ baselineHeight: v }), { min: 0 })}
      </div>

      <div class="grid-computed">
        <span class="grid-computed__label">Column Width</span>
        <span class="grid-computed__value">{columnWidth}px</span>
      </div>

      {/* 미니 프리뷰 */}
      <div class="grid-preview">
        <div class="grid-preview__inner" style={{ gap: `${Math.max(1, settings.gutterWidth / 8)}px` }}>
          {Array.from({ length: Math.min(settings.columns, 24) }, (_, i) => (
            <div class="grid-preview__col" key={i} />
          ))}
        </div>
      </div>

      <button
        class="grid-reset-btn"
        onClick={() => {
          setSettings(toSettings(report));
          chrome.runtime.sendMessage({
            type: 'UPDATE_GRID_SETTINGS',
            data: toSettings(report),
          });
        }}
      >
        Auto Detect
      </button>
    </div>
  );
}
