import {
  parseColor,
  relativeLuminance,
  contrastRatio,
} from '@shared/color-utils';
import { getFeatureLayer, clearFeatureLayer, removeFeatureLayer } from '../overlay-host';
import type { Message } from '@shared/messages';
import type { ContrastReport, ContrastResult } from '@shared/types';

let active = false;

// 배경색 조상 탐색 결과를 캐시하여 중복 순회 방지
const bgCache = new WeakMap<Element, [number, number, number]>();
const RE_ALPHA = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)/;

function getEffectiveBackground(el: Element): [number, number, number] {
  const cached = bgCache.get(el);
  if (cached) return cached;

  let current: Element | null = el;
  while (current) {
    const bg = getComputedStyle(current).backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      const alphaMatch = RE_ALPHA.exec(bg);
      if (alphaMatch && parseFloat(alphaMatch[1]) < 0.1) {
        current = current.parentElement;
        continue;
      }
      const parsed = parseColor(bg);
      bgCache.set(el, parsed);
      return parsed;
    }
    current = current.parentElement;
  }
  const white: [number, number, number] = [255, 255, 255];
  bgCache.set(el, white);
  return white;
}

function getUniqueSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (!parent) return tag;
  const siblings = Array.from(parent.children).filter(
    (c) => c.tagName === el.tagName
  );
  if (siblings.length === 1) return `${tag}`;
  const index = siblings.indexOf(el) + 1;
  return `${tag}:nth-child(${index})`;
}

function analyzeContrast(): ContrastResult[] {
  const results: ContrastResult[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent || parent.offsetParent === null) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const processedElements = new Set<Element>();

  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (!parent || processedElements.has(parent)) continue;
    processedElements.add(parent);

    const rect = parent.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const fgColor = parseColor(getComputedStyle(parent).color);
    const bgColor = getEffectiveBackground(parent);

    const fgLum = relativeLuminance(...fgColor);
    const bgLum = relativeLuminance(...bgColor);
    const ratio = contrastRatio(fgLum, bgLum);
    const passes = ratio >= 4.5;

    const text = (parent.textContent ?? '').trim().slice(0, 50);
    results.push({
      selector: getUniqueSelector(parent),
      text,
      foreground: `rgb(${fgColor.join(',')})`,
      background: `rgb(${bgColor.join(',')})`,
      ratio: Math.round(ratio * 100) / 100,
      passes,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    });
  }

  return results;
}

function renderBadges(results: ContrastResult[]): void {
  const layer = getFeatureLayer('contrast');
  const fragment = document.createDocumentFragment();

  for (const result of results) {
    const badge = document.createElement('div');
    badge.className = `xray-badge ${result.passes ? 'xray-badge--pass' : 'xray-badge--fail'}`;
    badge.style.top = `${result.rect.top}px`;
    badge.style.left = `${result.rect.left + result.rect.width - 45}px`;
    badge.textContent = `${result.ratio.toFixed(1)}:1`;
    fragment.appendChild(badge);
  }

  layer.appendChild(fragment);
}

function sendReport(results: ContrastResult[]): void {
  // 단일 순회로 pass/fail 카운트
  let passCount = 0;
  for (const r of results) { if (r.passes) passCount++; }
  const report: ContrastReport = {
    results,
    passCount,
    failCount: results.length - passCount,
  };
  const message: Message = { type: 'CONTRAST_REPORT', data: report };
  chrome.runtime.sendMessage(message).catch(() => {});
}

export function activateContrast(): void {
  if (active) {
    clearFeatureLayer('contrast');
  }
  active = true;
  const results = analyzeContrast();
  renderBadges(results);
  sendReport(results);
}

export function deactivateContrast(): void {
  active = false;
  removeFeatureLayer('contrast');
}
