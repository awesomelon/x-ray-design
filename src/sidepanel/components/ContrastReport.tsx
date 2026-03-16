import type { ContrastReport } from '@shared/types';

interface Props {
  report: ContrastReport;
}

export function ContrastReportView({ report }: Readonly<Props>) {
  const total = report.passCount + report.failCount;
  const passRate = total > 0 ? Math.round((report.passCount / total) * 100) : 0;

  const failedResults = report.results
    .filter((r) => !r.passes)
    .sort((a, b) => a.ratio - b.ratio);

  return (
    <div class="report">
      {/* 요약 */}
      <div class="contrast-summary">
        <div class="contrast-stat">
          <span class="contrast-stat__value">{total}</span>
          <span class="contrast-stat__label">Total</span>
        </div>
        <div class="contrast-stat contrast-stat--pass">
          <span class="contrast-stat__value">{report.passCount}</span>
          <span class="contrast-stat__label">Pass</span>
        </div>
        <div class="contrast-stat contrast-stat--fail">
          <span class="contrast-stat__value">{report.failCount}</span>
          <span class="contrast-stat__label">Fail</span>
        </div>
        <div class="contrast-stat">
          <span class="contrast-stat__value">{passRate}%</span>
          <span class="contrast-stat__label">Rate</span>
        </div>
      </div>

      {/* 실패 목록 */}
      {failedResults.length > 0 && (
        <div class="contrast-failures">
          <h4>Failures ({failedResults.length})</h4>
          {failedResults.map((result, i) => (
            <div class="contrast-item" key={i}>
              <div class="contrast-item__header">
                <span class="contrast-item__ratio">{result.ratio.toFixed(2)}:1</span>
                <span class="contrast-item__need">need 4.5:1</span>
              </div>
              <div class="contrast-item__text">{result.text}</div>
              <div class="contrast-item__colors">
                <span
                  class="color-swatch"
                  style={{ backgroundColor: result.foreground }}
                  title={`FG: ${result.foreground}`}
                />
                <span class="color-swatch__label">on</span>
                <span
                  class="color-swatch"
                  style={{ backgroundColor: result.background }}
                  title={`BG: ${result.background}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {failedResults.length === 0 && total > 0 && (
        <div class="report-empty">모든 텍스트가 WCAG AA 기준을 충족합니다.</div>
      )}
    </div>
  );
}
