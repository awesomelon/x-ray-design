import { getFeatureLayer, removeFeatureLayer } from '../overlay-host';
import type { Message } from '@shared/messages';
import type { GridReport, GridSettings } from '@shared/types';

let gridContainer: HTMLElement | null = null;
let baselineEl: HTMLElement | null = null;
const onResize = () => {
  if (gridContainer) renderGrid(lastReport);
};

let lastReport: GridReport | null = null;

/**
 * 페이지의 최외곽 콘텐츠 컨테이너를 추정한다.
 * max-width가 설정된 가장 넓은 직계 자식을 찾는다.
 */
function detectContainer(): { el: Element; maxWidth: number } | null {
  const candidates: { el: Element; maxWidth: number; width: number }[] = [];

  // body 직계 자식 및 한 단계 아래까지 탐색
  const elements = document.querySelectorAll('body > *, body > * > *');
  for (const el of elements) {
    const style = getComputedStyle(el);
    const maxW = parseFloat(style.maxWidth);
    const width = el.getBoundingClientRect().width;
    if (!isNaN(maxW) && maxW > 0 && maxW < window.innerWidth && width > 200) {
      candidates.push({ el, maxWidth: maxW, width });
    }
  }

  if (candidates.length === 0) return null;
  // 가장 넓은 max-width 컨테이너를 채택
  candidates.sort((a, b) => b.maxWidth - a.maxWidth);
  return { el: candidates[0].el, maxWidth: candidates[0].maxWidth };
}

/**
 * 컨테이너 내부의 컬럼 그리드 구조를 감지한다.
 * CSS Grid 또는 Flexbox의 자식 수와 gap을 분석한다.
 */
function detectGrid(container: Element): { columns: number; gutter: number } {
  const style = getComputedStyle(container);

  // CSS Grid 감지
  if (style.display.includes('grid')) {
    const templateCols = style.gridTemplateColumns.split(/\s+/).filter(Boolean);
    const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
    return { columns: templateCols.length, gutter: gap };
  }

  // Flexbox 감지: 자식 요소들의 너비 패턴 분석
  if (style.display.includes('flex')) {
    const children = Array.from(container.children).filter((c) => {
      const cs = getComputedStyle(c);
      return cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed';
    });
    const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
    if (children.length >= 2) {
      return { columns: children.length, gutter: gap };
    }
  }

  // 자식 요소 너비 패턴으로 추정 (일반 block)
  const children = Array.from(container.children).filter((c) => {
    const cs = getComputedStyle(c);
    return cs.display !== 'none' && cs.position !== 'absolute';
  });

  // 같은 줄에 있는 자식을 찾음 (top이 같은 요소들)
  if (children.length >= 2) {
    const topMap = new Map<number, Element[]>();
    for (const child of children) {
      const top = Math.round(child.getBoundingClientRect().top);
      const group = topMap.get(top) ?? [];
      group.push(child);
      topMap.set(top, group);
    }
    // 가장 많은 요소가 같은 줄에 있는 그룹
    let maxGroup: Element[] = [];
    for (const group of topMap.values()) {
      if (group.length > maxGroup.length) maxGroup = group;
    }
    if (maxGroup.length >= 2) {
      // 요소 간 간격을 gutter로 추정
      const rects = maxGroup.map((el) => el.getBoundingClientRect());
      rects.sort((a, b) => a.left - b.left);
      const gaps: number[] = [];
      for (let i = 1; i < rects.length; i++) {
        gaps.push(rects[i].left - rects[i - 1].right);
      }
      const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
      return { columns: maxGroup.length, gutter: Math.round(avgGap) };
    }
  }

  // 감지 실패 시 12단 기본값
  return { columns: 12, gutter: 24 };
}

/**
 * 베이스라인 높이를 body의 line-height에서 추출한다.
 */
function detectBaseline(): number | null {
  const style = getComputedStyle(document.body);
  const lineHeight = parseFloat(style.lineHeight);
  if (!isNaN(lineHeight) && lineHeight > 0) {
    return Math.round(lineHeight);
  }
  const fontSize = parseFloat(style.fontSize);
  if (!isNaN(fontSize)) {
    return Math.round(fontSize * 1.5);
  }
  return 24;
}

function analyze(): GridReport {
  const containerInfo = detectContainer();
  const containerEl = containerInfo?.el ?? document.body;
  const gridInfo = detectGrid(containerEl);
  const baselineHeight = detectBaseline();

  const containerRect = containerEl.getBoundingClientRect();
  const containerMaxWidth = containerInfo?.maxWidth ?? null;
  const totalGutters = (gridInfo.columns - 1) * gridInfo.gutter;
  const columnWidth =
    containerMaxWidth !== null
      ? Math.round((containerMaxWidth - totalGutters) / gridInfo.columns)
      : Math.round((containerRect.width - totalGutters) / gridInfo.columns);

  return {
    containerMaxWidth,
    columns: gridInfo.columns,
    columnWidth,
    gutterWidth: Math.round(gridInfo.gutter),
    marginLeft: Math.round(containerRect.left),
    marginRight: Math.round(window.innerWidth - containerRect.right),
    baselineHeight,
  };
}

function renderGrid(report: GridReport | null): void {
  if (!report) return;
  const layer = getFeatureLayer('grid');
  layer.replaceChildren();

  // 컬럼 그리드
  const container = document.createElement('div');
  container.className = 'xray-grid-container';

  const columnsWrap = document.createElement('div');
  columnsWrap.className = 'xray-grid-columns';
  columnsWrap.style.setProperty('--xray-gutter', `${report.gutterWidth}px`);

  const contentWidth = report.containerMaxWidth ?? window.innerWidth - report.marginLeft - report.marginRight;
  columnsWrap.style.left = `${report.marginLeft}px`;
  columnsWrap.style.width = `${contentWidth}px`;

  for (let i = 0; i < report.columns; i++) {
    const col = document.createElement('div');
    col.className = 'xray-grid-col';
    columnsWrap.appendChild(col);
  }

  container.appendChild(columnsWrap);
  layer.appendChild(container);
  gridContainer = container;

  // 베이스라인 그리드
  if (report.baselineHeight) {
    const baseline = document.createElement('div');
    baseline.className = 'xray-grid-baseline';
    baseline.style.setProperty('--xray-baseline', `${report.baselineHeight}px`);
    layer.appendChild(baseline);
    baselineEl = baseline;
  }
}

function sendReport(report: GridReport): void {
  const message: Message = { type: 'GRID_REPORT', data: report };
  chrome.runtime.sendMessage(message).catch(() => {});
}

export function activateGrid(): void {
  lastReport = analyze();
  renderGrid(lastReport);
  sendReport(lastReport);
  window.addEventListener('resize', onResize);
}

export function applyGridSettings(settings: GridSettings): void {
  const totalGutters = (settings.columns - 1) * settings.gutterWidth;
  const contentWidth = settings.containerMaxWidth
    ?? (window.innerWidth - settings.marginLeft - settings.marginRight);
  const columnWidth = Math.round((contentWidth - totalGutters) / settings.columns);

  lastReport = {
    columns: settings.columns,
    columnWidth,
    gutterWidth: settings.gutterWidth,
    containerMaxWidth: settings.containerMaxWidth,
    marginLeft: settings.marginLeft,
    marginRight: settings.marginRight,
    baselineHeight: settings.baselineHeight,
  };
  renderGrid(lastReport);
  sendReport(lastReport);
}

export function deactivateGrid(): void {
  window.removeEventListener('resize', onResize);
  removeFeatureLayer('grid');
  gridContainer = null;
  baselineEl = null;
  lastReport = null;
}
