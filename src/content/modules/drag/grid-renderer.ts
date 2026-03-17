import { getFeatureLayer, removeFeatureLayer } from '../../overlay-host';
import type { GridReport, GridSettings } from '@shared/types';

const LAYER_ID = 'drag-grid';

let lastReport: GridReport | null = null;

// --- Auto-detection ---

function detectContainer(): { el: Element; maxWidth: number } | null {
  const candidates: { el: Element; maxWidth: number; width: number }[] = [];
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
  candidates.sort((a, b) => b.maxWidth - a.maxWidth);
  return { el: candidates[0].el, maxWidth: candidates[0].maxWidth };
}

function detectGrid(container: Element): { columns: number; gutter: number } {
  const style = getComputedStyle(container);

  if (style.display.includes('grid')) {
    const templateCols = style.gridTemplateColumns.split(/\s+/).filter(Boolean);
    const gap = parseFloat(style.columnGap) || parseFloat(style.gap) || 0;
    return { columns: templateCols.length, gutter: gap };
  }

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

  const children = Array.from(container.children).filter((c) => {
    const cs = getComputedStyle(c);
    return cs.display !== 'none' && cs.position !== 'absolute';
  });

  if (children.length >= 2) {
    const topMap = new Map<number, Element[]>();
    for (const child of children) {
      const top = Math.round(child.getBoundingClientRect().top);
      const group = topMap.get(top) ?? [];
      group.push(child);
      topMap.set(top, group);
    }
    let maxGroup: Element[] = [];
    for (const group of topMap.values()) {
      if (group.length > maxGroup.length) maxGroup = group;
    }
    if (maxGroup.length >= 2) {
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

  return { columns: 12, gutter: 24 };
}

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

// --- Rendering ---

function renderGrid(report: GridReport): void {
  const layer = getFeatureLayer(LAYER_ID);
  layer.replaceChildren();

  const container = document.createElement('div');
  container.className = 'xray-grid-container';

  const columnsWrap = document.createElement('div');
  columnsWrap.className = 'xray-grid-columns';
  columnsWrap.style.setProperty('--xray-gutter', `${report.gutterWidth}px`);

  const contentWidth =
    report.containerMaxWidth ?? window.innerWidth - report.marginLeft - report.marginRight;
  columnsWrap.style.left = `${report.marginLeft}px`;
  columnsWrap.style.width = `${contentWidth}px`;

  for (let i = 0; i < report.columns; i++) {
    const col = document.createElement('div');
    col.className = 'xray-grid-col';
    columnsWrap.appendChild(col);
  }

  container.appendChild(columnsWrap);
  layer.appendChild(container);

  if (report.baselineHeight) {
    const baseline = document.createElement('div');
    baseline.className = 'xray-grid-baseline';
    baseline.style.setProperty('--xray-baseline', `${report.baselineHeight}px`);
    layer.appendChild(baseline);
  }
}

// --- Public API ---

export function mountGrid(): GridReport {
  lastReport = analyze();
  renderGrid(lastReport);
  window.addEventListener('resize', onResize);
  return lastReport;
}

export function unmountGrid(): void {
  window.removeEventListener('resize', onResize);
  removeFeatureLayer(LAYER_ID);
  lastReport = null;
}

export function applySettings(settings: GridSettings): GridReport {
  const totalGutters = (settings.columns - 1) * settings.gutterWidth;
  const contentWidth =
    settings.containerMaxWidth ??
    window.innerWidth - settings.marginLeft - settings.marginRight;
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
  return lastReport;
}

export function getLastReport(): GridReport | null {
  return lastReport;
}

function onResize(): void {
  if (lastReport) renderGrid(lastReport);
}
