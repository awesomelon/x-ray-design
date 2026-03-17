import { getFeatureLayer } from '../../overlay-host';
import { snapToGrid } from './snap-engine';
import { setSelected, clearSelectionHighlight } from './selection-state';
import type { GridReport } from '@shared/types';

// --- Constants ---

const IGNORE_TAGS = new Set([
  'HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR',
]);

const DRAG_THRESHOLD_SQ = 9; // 3px squared

// --- Interfaces ---

interface OriginalState {
  cssText: string;
  placeholder: HTMLDivElement;
}

interface PendingDrag {
  el: HTMLElement;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

interface ActiveDrag {
  el: HTMLElement;
  offsetX: number;
  offsetY: number;
}

// --- State ---

let active = false;
const movedElements = new Map<HTMLElement, OriginalState>();
let pendingDrag: PendingDrag | null = null;
let activeDrag: ActiveDrag | null = null;
let hoveredEl: HTMLElement | null = null;
let highlightBox: HTMLDivElement | null = null;
let dragRafId = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let getGridReport: () => GridReport | null = () => null;

// --- Helpers ---

function shouldIgnore(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  if (IGNORE_TAGS.has(el.tagName)) return true;
  if (el.closest('x-ray-overlay')) return true;
  return false;
}

function createsContainingBlock(style: CSSStyleDeclaration): boolean {
  if (style.transform !== 'none') return true;
  if (style.filter !== 'none') return true;
  if (style.perspective !== 'none') return true;
  const wc = style.willChange;
  if (wc === 'transform' || wc === 'filter' || wc === 'perspective') return true;
  const ct = style.contain;
  if (ct.includes('layout') || ct.includes('paint') || ct === 'strict' || ct === 'content')
    return true;
  return false;
}

function getContainingBlockOffset(el: HTMLElement): { x: number; y: number } {
  let parent = el.parentElement;
  while (parent && parent !== document.documentElement) {
    if (createsContainingBlock(getComputedStyle(parent))) {
      const rect = parent.getBoundingClientRect();
      return { x: rect.left, y: rect.top };
    }
    parent = parent.parentElement;
  }
  return { x: 0, y: 0 };
}

// --- Highlight (hover) ---

function renderHighlight(el: HTMLElement): void {
  const layer = getFeatureLayer('drag');
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  if (!highlightBox || !highlightBox.isConnected) {
    highlightBox = document.createElement('div');
    highlightBox.className = 'xray-drag-highlight';
    layer.appendChild(highlightBox);
  }
  highlightBox.style.cssText =
    `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
}

function clearHighlight(): void {
  if (highlightBox) {
    highlightBox.remove();
    highlightBox = null;
  }
}

// --- Fixed positioning ---

export function promoteToFixed(el: HTMLElement): void {
  if (movedElements.has(el)) return;

  const rect = el.getBoundingClientRect();
  const computed = getComputedStyle(el);

  const placeholder = document.createElement('div');
  placeholder.style.cssText =
    `width:${rect.width}px;height:${rect.height}px;` +
    `margin-top:${computed.marginTop};margin-right:${computed.marginRight};` +
    `margin-bottom:${computed.marginBottom};margin-left:${computed.marginLeft};` +
    `visibility:hidden;` +
    `flex-shrink:${computed.flexShrink};flex-grow:${computed.flexGrow};` +
    `grid-column:${computed.gridColumn};grid-row:${computed.gridRow};` +
    `grid-area:${computed.gridArea};order:${computed.order};` +
    `align-self:${computed.alignSelf};justify-self:${computed.justifySelf};`;
  el.parentNode?.insertBefore(placeholder, el);
  movedElements.set(el, { cssText: el.style.cssText, placeholder });

  const offset = getContainingBlockOffset(el);
  el.style.position = 'fixed';
  el.style.left = `${rect.left - offset.x}px`;
  el.style.top = `${rect.top - offset.y}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.zIndex = '2147483646';
  el.style.margin = '0';
  el.style.boxSizing = 'border-box';
}

// --- Snap helper ---

function applySnap(rawLeft: number, rawTop: number, w: number, h: number): { left: number; top: number } {
  const grid = getGridReport();
  if (!grid) return { left: rawLeft, top: rawTop };
  const snapped = snapToGrid(rawLeft, rawTop, w, h, grid);
  return { left: snapped.left, top: snapped.top };
}

// --- Drag core ---

function commitDrag(pending: PendingDrag, e: MouseEvent): void {
  const { el, offsetX, offsetY } = pending;

  promoteToFixed(el);

  const offset = getContainingBlockOffset(el);
  const rawLeft = e.clientX - offsetX - offset.x;
  const rawTop = e.clientY - offsetY - offset.y;
  const pos = applySnap(rawLeft, rawTop, el.offsetWidth, el.offsetHeight);

  el.style.left = `${pos.left}px`;
  el.style.top = `${pos.top}px`;

  activeDrag = { el, offsetX: offsetX + offset.x, offsetY: offsetY + offset.y };
  clearHighlight();
  clearSelectionHighlight();
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
}

function resetAll(): void {
  for (const [el, state] of movedElements) {
    if (el.isConnected) {
      el.style.cssText = state.cssText;
    }
    state.placeholder.remove();
  }
  movedElements.clear();
}

function finishDrag(): void {
  if (!activeDrag) return;
  const el = activeDrag.el;
  activeDrag = null;
  pendingDrag = null;
  document.body.style.cursor = 'grab';
  document.body.style.userSelect = '';
  clearHighlight();
  hoveredEl = null;
  setSelected(el);
}

// --- Event handlers ---

function onMouseDown(e: MouseEvent): void {
  if (!active || activeDrag) return;
  const el = e.target as HTMLElement;
  if (shouldIgnore(el)) return;
  e.preventDefault();
  e.stopPropagation();

  const rect = el.getBoundingClientRect();
  pendingDrag = {
    el,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };
}

function onMouseMove(e: MouseEvent): void {
  if (!active) return;

  if (activeDrag) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (!dragRafId) {
      dragRafId = requestAnimationFrame(() => {
        dragRafId = 0;
        if (activeDrag) {
          const rawLeft = lastMouseX - activeDrag.offsetX;
          const rawTop = lastMouseY - activeDrag.offsetY;
          const pos = applySnap(rawLeft, rawTop, activeDrag.el.offsetWidth, activeDrag.el.offsetHeight);
          activeDrag.el.style.left = `${pos.left}px`;
          activeDrag.el.style.top = `${pos.top}px`;
        }
      });
    }
    return;
  }

  if (pendingDrag) {
    const dx = e.clientX - pendingDrag.startX;
    const dy = e.clientY - pendingDrag.startY;
    if (dx * dx + dy * dy > DRAG_THRESHOLD_SQ) {
      commitDrag(pendingDrag, e);
      pendingDrag = null;
    }
    return;
  }

  const el = e.target as HTMLElement;
  if (shouldIgnore(el) || el === hoveredEl) return;
  hoveredEl = el;
  renderHighlight(el);
}

function onMouseUp(): void {
  if (activeDrag) {
    finishDrag();
  }
  pendingDrag = null;
}

function onClick(e: MouseEvent): void {
  if (!active) return;
  e.preventDefault();
  e.stopPropagation();

  if (!activeDrag) {
    const el = e.target as HTMLElement;
    if (!shouldIgnore(el)) {
      setSelected(el);
    }
  }
}

function onDragStart(e: DragEvent): void {
  if (!active) return;
  e.preventDefault();
}

function onKeyDown(e: KeyboardEvent): void {
  if (!active) return;
  if (e.key === 'Escape') {
    if (activeDrag) {
      const el = activeDrag.el;
      const state = movedElements.get(el);
      if (state) {
        el.style.cssText = state.cssText;
        state.placeholder.remove();
        movedElements.delete(el);
      } else {
        el.style.position = '';
        el.style.zIndex = '';
      }
      activeDrag = null;
      pendingDrag = null;
      document.body.style.cursor = 'grab';
      document.body.style.userSelect = '';
      clearHighlight();
      hoveredEl = null;
      setSelected(null);
    } else {
      pendingDrag = null;
      setSelected(null);
      resetAll();
    }
  }
}

function onScroll(): void {
  if (!active || activeDrag || pendingDrag) return;
  hoveredEl = null;
  clearHighlight();
}

function onWindowMouseLeave(e: MouseEvent): void {
  if (!active) return;
  if (e.relatedTarget !== null) return;
  if (activeDrag) finishDrag();
  pendingDrag = null;
}

// --- Public API ---

export function initDragCore(deps: { getSnapGrid: () => GridReport | null }): void {
  active = true;
  getGridReport = deps.getSnapGrid;
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('dragstart', onDragStart, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('scroll', onScroll, true);
  document.addEventListener('mouseleave', onWindowMouseLeave);
  document.body.style.cursor = 'grab';
}

export function teardownDragCore(): void {
  active = false;
  cancelAnimationFrame(dragRafId);
  dragRafId = 0;
  activeDrag = null;
  pendingDrag = null;
  hoveredEl = null;
  clearHighlight();
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('dragstart', onDragStart, true);
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('scroll', onScroll, true);
  document.removeEventListener('mouseleave', onWindowMouseLeave);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  resetAll();
}

export function nudgeElement(el: HTMLElement, dx: number, dy: number): void {
  promoteToFixed(el);
  const curLeft = parseFloat(el.style.left) || 0;
  const curTop = parseFloat(el.style.top) || 0;
  el.style.left = `${curLeft + dx}px`;
  el.style.top = `${curTop + dy}px`;
}
