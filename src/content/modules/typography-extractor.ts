import type { Message } from '@shared/messages';
import type { TypographyReport, TypographyScaleEntry } from '@shared/types';

const NAMED_RATIOS: [number, string][] = [
  [1.067, 'Minor Second'],
  [1.125, 'Major Second'],
  [1.2, 'Minor Third'],
  [1.25, 'Major Third'],
  [1.333, 'Perfect Fourth'],
  [1.414, 'Augmented Fourth'],
  [1.5, 'Perfect Fifth'],
  [1.618, 'Golden Ratio'],
];

function matchRatioName(r: number): string | null {
  let closest: string | null = null;
  let minDiff = Infinity;
  for (const [value, name] of NAMED_RATIOS) {
    const diff = Math.abs(r - value);
    if (diff < minDiff && diff < 0.03) {
      minDiff = diff;
      closest = name;
    }
  }
  return closest;
}

function collectFontSizes(): Map<number, number> {
  const sizeMap = new Map<number, number>();
  const visited = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.offsetParent === null) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (!parent || visited.has(parent)) continue;
    visited.add(parent);
    const fontSize = parseFloat(getComputedStyle(parent).fontSize);
    if (isNaN(fontSize) || fontSize === 0) continue;
    const rounded = Math.round(fontSize * 10) / 10;
    sizeMap.set(rounded, (sizeMap.get(rounded) ?? 0) + 1);
  }

  return sizeMap;
}

function deriveScale(sizeMap: Map<number, number>): TypographyReport {
  const entries = Array.from(sizeMap.entries());
  if (entries.length === 0) {
    return {
      baseFontSize: 0,
      ratio: 0,
      ratioName: null,
      scale: [],
      sizeFrequency: {},
    };
  }

  // f_0: 가장 빈도 높은 폰트 크기
  const baseFontSize = entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  // 고유 크기를 정렬
  const uniqueSizes = entries.map(([size]) => size).sort((a, b) => a - b);

  // 인접 크기 간의 비율을 수집
  const ratios: number[] = [];
  for (let i = 1; i < uniqueSizes.length; i++) {
    const r = uniqueSizes[i] / uniqueSizes[i - 1];
    if (r > 1 && r < 3) {
      ratios.push(r);
    }
  }

  // 중앙값을 r로 채택
  ratios.sort((a, b) => a - b);
  const ratio =
    ratios.length > 0
      ? ratios[Math.floor(ratios.length / 2)]
      : 1;

  const ratioName = matchRatioName(ratio);

  // baseFontSize 기준 스케일 테이블 생성
  const scale: TypographyScaleEntry[] = [];
  const sizesAboveBase = uniqueSizes.filter((s) => s >= baseFontSize);
  sizesAboveBase.forEach((actual, i) => {
    const expected = baseFontSize * Math.pow(ratio, i);
    const deviation = expected > 0 ? ((actual - expected) / expected) * 100 : 0;
    scale.push({
      level: i === 0 ? 'Base' : `H${Math.min(i, 6)}`,
      expected: Math.round(expected * 10) / 10,
      actual,
      deviation: Math.round(deviation * 10) / 10,
    });
  });

  const sizeFrequency: Record<number, number> = {};
  for (const [size, count] of entries) {
    sizeFrequency[size] = count;
  }

  return { baseFontSize, ratio: Math.round(ratio * 1000) / 1000, ratioName, scale, sizeFrequency };
}

function sendReport(report: TypographyReport): void {
  const message: Message = { type: 'TYPOGRAPHY_REPORT', data: report };
  chrome.runtime.sendMessage(message).catch(() => {});
}

export function activateTypography(): void {
  const sizeMap = collectFontSizes();
  const report = deriveScale(sizeMap);
  sendReport(report);
}

export function deactivateTypography(): void {
  // DOM 조작 없으므로 정리할 것 없음
}
