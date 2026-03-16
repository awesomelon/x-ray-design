import type { TypographyReport } from '@shared/types';

interface Props {
  report: TypographyReport;
}

export function TypographyReportView({ report }: Readonly<Props>) {
  if (report.baseFontSize === 0) {
    return <div class="report-empty">텍스트 노드를 찾을 수 없습니다.</div>;
  }

  const maxCount = Math.max(...Object.values(report.sizeFrequency));

  return (
    <div class="report">
      {/* 공식 */}
      <div class="report-formula">
        <code>
          f(n) = {report.baseFontSize}px × {report.ratio}
          <sup>n</sup>
        </code>
        {report.ratioName && (
          <span class="report-formula__name">{report.ratioName}</span>
        )}
      </div>

      {/* 스케일 테이블 */}
      <table class="report-table">
        <thead>
          <tr>
            <th>Level</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Deviation</th>
          </tr>
        </thead>
        <tbody>
          {report.scale.map((entry) => (
            <tr key={entry.level}>
              <td>{entry.level}</td>
              <td>{entry.expected}px</td>
              <td>{entry.actual}px</td>
              <td class={Math.abs(entry.deviation) > 5 ? 'deviation--warn' : ''}>
                {entry.deviation > 0 ? '+' : ''}
                {entry.deviation}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 히스토그램 */}
      <div class="report-histogram">
        <h4>Size Distribution</h4>
        {Object.entries(report.sizeFrequency)
          .sort(([a], [b]) => +a - +b)
          .map(([size, count]) => (
            <div class="histogram-row" key={size}>
              <span class="histogram-label">{size}px</span>
              <div class="histogram-bar-bg">
                <div
                  class="histogram-bar"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span class="histogram-count">{count}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
