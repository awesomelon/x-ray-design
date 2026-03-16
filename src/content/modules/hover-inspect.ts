import { getFeatureLayer, clearFeatureLayer, removeFeatureLayer } from '../overlay-host';
import type { Message } from '@shared/messages';
import type { InspectInfo } from '@shared/types';

let active = false;
let currentEl: Element | null = null;
let rafId = 0;
let pendingEl: Element | null = null;

// sendMessage 스로틀: 최대 ~15fps로 Side Panel 업데이트
let sendTimer: ReturnType<typeof setTimeout> | null = null;
let lastSentInfo: InspectInfo | null = null;

function extractInfo(style: CSSStyleDeclaration, rect: DOMRect, el: Element): InspectInfo {
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id,
    classes: Array.from(el.classList),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    margin: {
      top: parseFloat(style.marginTop) || 0,
      right: parseFloat(style.marginRight) || 0,
      bottom: parseFloat(style.marginBottom) || 0,
      left: parseFloat(style.marginLeft) || 0,
    },
    padding: {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    },
    fontSize: style.fontSize,
    fontFamily: style.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    color: style.color,
    backgroundColor: style.backgroundColor,
    display: style.display,
    position: style.position,
  };
}

function renderFrame(): void {
  const el = pendingEl;
  if (!el || !active) return;

  const layer = getFeatureLayer('inspect');
  layer.replaceChildren();

  // getComputedStyle + getBoundingClientRect 1회만 호출
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const mt = parseFloat(style.marginTop) || 0;
  const mr = parseFloat(style.marginRight) || 0;
  const mb = parseFloat(style.marginBottom) || 0;
  const ml = parseFloat(style.marginLeft) || 0;
  const pt = parseFloat(style.paddingTop) || 0;
  const pr = parseFloat(style.paddingRight) || 0;
  const pb = parseFloat(style.paddingBottom) || 0;
  const pl = parseFloat(style.paddingLeft) || 0;

  const fragment = document.createDocumentFragment();

  // Margin areas
  const marginAreas = [
    { l: rect.left - ml, t: rect.top - mt, w: rect.width + ml + mr, h: mt },
    { l: rect.left - ml, t: rect.bottom, w: rect.width + ml + mr, h: mb },
    { l: rect.left - ml, t: rect.top, w: ml, h: rect.height },
    { l: rect.right, t: rect.top, w: mr, h: rect.height },
  ];
  for (const a of marginAreas) {
    if (a.w <= 0 || a.h <= 0) continue;
    const div = document.createElement('div');
    div.className = 'xray-inspect-margin';
    div.style.cssText = `left:${a.l}px;top:${a.t}px;width:${a.w}px;height:${a.h}px;`;
    fragment.appendChild(div);
  }

  // Padding areas
  const paddingAreas = [
    { l: rect.left, t: rect.top, w: rect.width, h: pt },
    { l: rect.left, t: rect.bottom - pb, w: rect.width, h: pb },
    { l: rect.left, t: rect.top + pt, w: pl, h: rect.height - pt - pb },
    { l: rect.right - pr, t: rect.top + pt, w: pr, h: rect.height - pt - pb },
  ];
  for (const a of paddingAreas) {
    if (a.w <= 0 || a.h <= 0) continue;
    const div = document.createElement('div');
    div.className = 'xray-inspect-padding';
    div.style.cssText = `left:${a.l}px;top:${a.t}px;width:${a.w}px;height:${a.h}px;`;
    fragment.appendChild(div);
  }

  // Content border
  const content = document.createElement('div');
  content.className = 'xray-inspect-content';
  content.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
  fragment.appendChild(content);

  // Tooltip — style/rect를 재활용하여 extractInfo에 전달
  const info = extractInfo(style, rect, el);
  const tooltip = document.createElement('div');
  tooltip.className = 'xray-inspect-tooltip';

  const tagStr = `<span class="xray-inspect-tooltip__tag">&lt;${info.tag}${info.id ? '#' + info.id : ''}${info.classes.length ? '.' + info.classes.slice(0, 2).join('.') : ''}&gt;</span>`;
  const dimStr = `<span class="xray-inspect-tooltip__dim">${info.width} × ${info.height}</span>`;
  const mStr = `<span class="xray-inspect-tooltip__m">M: ${info.margin.top} ${info.margin.right} ${info.margin.bottom} ${info.margin.left}</span>`;
  const pStr = `<span class="xray-inspect-tooltip__p">P: ${info.padding.top} ${info.padding.right} ${info.padding.bottom} ${info.padding.left}</span>`;
  tooltip.innerHTML = `${tagStr}  ${dimStr}<div class="xray-inspect-tooltip__spacing">${mStr}${pStr}</div>`;

  let tooltipTop = rect.bottom + mt + 6;
  if (tooltipTop + 60 > window.innerHeight) {
    tooltipTop = rect.top - mt - 50;
  }
  tooltip.style.top = `${tooltipTop}px`;
  tooltip.style.left = `${Math.max(4, Math.min(rect.left, window.innerWidth - 330))}px`;
  fragment.appendChild(tooltip);

  layer.appendChild(fragment);

  // Side Panel 전송을 스로틀 (~66ms = 15fps)
  if (!sendTimer) {
    sendTimer = setTimeout(() => {
      sendTimer = null;
      if (lastSentInfo !== info) {
        lastSentInfo = info;
        const message: Message = { type: 'INSPECT_REPORT', data: info };
        chrome.runtime.sendMessage(message).catch(() => {});
      }
    }, 66);
  }
}

function onMouseMove(e: MouseEvent): void {
  if (!active) return;
  const el = e.target as Element;
  if (!el || el === currentEl) return;
  if (el.closest('x-ray-overlay')) return;
  if (el === document.documentElement || el === document.body) return;

  currentEl = el;
  pendingEl = el;

  // rAF로 프레임에 맞춰 렌더링 (중복 호출 방지)
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(renderFrame);
}

function onMouseLeave(): void {
  if (!active) return;
  currentEl = null;
  pendingEl = null;
  cancelAnimationFrame(rafId);
  clearFeatureLayer('inspect');
  if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
  const message: Message = { type: 'INSPECT_REPORT', data: null };
  chrome.runtime.sendMessage(message).catch(() => {});
}

export function activateInspect(): void {
  active = true;
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseleave', onMouseLeave);
  document.body.style.cursor = 'crosshair';
}

export function deactivateInspect(): void {
  active = false;
  currentEl = null;
  pendingEl = null;
  cancelAnimationFrame(rafId);
  if (sendTimer) { clearTimeout(sendTimer); sendTimer = null; }
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseleave', onMouseLeave);
  document.body.style.cursor = '';
  removeFeatureLayer('inspect');
  const message: Message = { type: 'INSPECT_REPORT', data: null };
  chrome.runtime.sendMessage(message).catch(() => {});
}
