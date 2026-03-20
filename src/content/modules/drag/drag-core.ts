import { getFeatureLayer } from '../../overlay-host';
import { snapToGrid } from './snap-engine';
import { renderSnapGuides, clearSnapGuides } from './snap-guides';
import { setSelected, clearSelectionHighlight } from './selection-state';
import type { GridReport } from '@shared/types';

// --- Constants ---

const IGNORE_TAGS = new Set([
  'HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR',
]);

const DRAG_THRESHOLD_SQ = 9; // 3px squared

// Magnetic snap constants
export const MAGNETIC_ZONE = 20;    // magnetic pull starts here (px)
export const BREAKAWAY_ZONE = 26;   // must exceed this to escape snap (px)
export const SNAP_LOCK = 2;         // dead zone — fully locked (px)

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
  cbOffsetX: number;
  cbOffsetY: number;
}

// --- State ---
//
//  State machine:
//
//    IDLE ──mousedown──▶ PENDING ──threshold──▶ DRAGGING ──mouseup──▶ IDLE
//     │                    │                       │
//     │                    └──mouseup──▶ IDLE      └──Esc──▶ IDLE (revert)
//     └──Esc──▶ IDLE (resetAll)
//

interface DragState {
  active: boolean;
  movedElements: Map<HTMLElement, OriginalState>;
  pending: PendingDrag | null;
  dragging: ActiveDrag | null;
  hoveredEl: HTMLElement | null;
  highlightBox: HTMLDivElement | null;
  rafId: number;
  lastMouseX: number;
  lastMouseY: number;
  wasSnappedX: boolean;
  wasSnappedY: boolean;
  getGridReport: () => GridReport | null;
}

function createInitialState(): DragState {
  return {
    active: false,
    movedElements: new Map(),
    pending: null,
    dragging: null,
    hoveredEl: null,
    highlightBox: null,
    rafId: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    wasSnappedX: false,
    wasSnappedY: false,
    getGridReport: () => null,
  };
}

let state = createInitialState();

// --- Helpers ---

export function shouldIgnore(el: Element): boolean {
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

  if (!state.highlightBox || !state.highlightBox.isConnected) {
    state.highlightBox = document.createElement('div');
    state.highlightBox.className = 'xray-drag-highlight';
    layer.appendChild(state.highlightBox);
  }
  state.highlightBox.style.cssText =
    `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
}

function clearHighlight(): void {
  if (state.highlightBox) {
    state.highlightBox.remove();
    state.highlightBox = null;
  }
}

// --- Fixed positioning ---

export function promoteToFixed(el: HTMLElement): void {
  if (state.movedElements.has(el)) return;

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
  state.movedElements.set(el, { cssText: el.style.cssText, placeholder });

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

// --- Magnetic snap ---

export function magneticInterpolate(
  rawPos: number,
  snapTarget: number,
  dist: number,
  wasSnapped: boolean,
  magneticZone = MAGNETIC_ZONE,
  breakawayZone = BREAKAWAY_ZONE,
): { pos: number; isSnapped: boolean } {
  const zone = Math.max(1, wasSnapped ? breakawayZone : magneticZone);

  if (dist > zone) {
    return { pos: rawPos, isSnapped: false };
  }

  if (dist <= SNAP_LOCK) {
    return { pos: snapTarget, isSnapped: true };
  }

  // Quadratic easing: stronger pull as distance decreases
  const t = 1 - (dist / zone) ** 2;
  const pos = rawPos + (snapTarget - rawPos) * t;
  return { pos, isSnapped: true };
}

// --- Snap helper ---

function applySnap(rawLeft: number, rawTop: number, w: number, h: number): { left: number; top: number } {
  const grid = state.getGridReport();
  if (!grid) {
    renderSnapGuides(null, null);
    return { left: rawLeft, top: rawTop };
  }

  // Containing block offset: convert to viewport-relative for accurate snap
  const cbX = state.dragging?.cbOffsetX ?? 0;
  const cbY = state.dragging?.cbOffsetY ?? 0;
  const snapped = snapToGrid(rawLeft + cbX, rawTop + cbY, w, h, grid);

  // Convert snap targets back to containing-block-relative
  const snapTargetLeft = snapped.snapTargetLeft - cbX;
  const snapTargetTop = snapped.snapTargetTop - cbY;

  // Adaptive magnetic zone: scale with gutter size
  const adaptiveZone = Math.min(MAGNETIC_ZONE, Math.max(1, grid.gutterWidth * 0.6));
  const adaptiveBreakaway = adaptiveZone * (BREAKAWAY_ZONE / MAGNETIC_ZONE);

  let finalLeft = rawLeft;
  let finalTop = rawTop;

  if (snapped.nearestGuideX !== null) {
    const xResult = magneticInterpolate(rawLeft, snapTargetLeft, snapped.nearestDistX, state.wasSnappedX, adaptiveZone, adaptiveBreakaway);
    state.wasSnappedX = xResult.isSnapped;
    finalLeft = xResult.pos;
  } else {
    state.wasSnappedX = false;
  }

  if (snapped.nearestGuideY !== null) {
    const yResult = magneticInterpolate(rawTop, snapTargetTop, snapped.nearestDistY, state.wasSnappedY, adaptiveZone, adaptiveBreakaway);
    state.wasSnappedY = yResult.isSnapped;
    finalTop = yResult.pos;
  } else {
    state.wasSnappedY = false;
  }

  // Guide lines remain viewport-relative (overlay is position: fixed)
  renderSnapGuides(
    state.wasSnappedX ? snapped.nearestGuideX : null,
    state.wasSnappedY ? snapped.nearestGuideY : null,
  );

  return { left: finalLeft, top: finalTop };
}

// --- Drag core ---

function commitDrag(pending: PendingDrag, e: MouseEvent): void {
  const { el, offsetX, offsetY } = pending;

  promoteToFixed(el);

  const offset = getContainingBlockOffset(el);

  // Set dragging state before applySnap so it can access cbOffset
  state.dragging = {
    el,
    offsetX: offsetX + offset.x,
    offsetY: offsetY + offset.y,
    cbOffsetX: offset.x,
    cbOffsetY: offset.y,
  };

  const rawLeft = e.clientX - offsetX - offset.x;
  const rawTop = e.clientY - offsetY - offset.y;
  const pos = applySnap(rawLeft, rawTop, el.offsetWidth, el.offsetHeight);

  el.style.left = `${pos.left}px`;
  el.style.top = `${pos.top}px`;

  clearHighlight();
  clearSelectionHighlight();
  document.body.style.cursor = 'grabbing';
  document.body.style.userSelect = 'none';
}

function resetAll(): void {
  for (const [el, orig] of state.movedElements) {
    if (el.isConnected) {
      el.style.cssText = orig.cssText;
    }
    orig.placeholder.remove();
  }
  state.movedElements.clear();
}

function finishDrag(): void {
  if (!state.dragging) return;
  const el = state.dragging.el;
  state.dragging = null;
  state.pending = null;
  state.wasSnappedX = false;
  state.wasSnappedY = false;
  document.body.style.cursor = 'grab';
  document.body.style.userSelect = '';
  clearHighlight();
  clearSnapGuides();
  state.hoveredEl = null;
  setSelected(el);
}

// --- Event handlers ---

function onMouseDown(e: MouseEvent): void {
  if (!state.active || state.dragging) return;
  const el = e.target as HTMLElement;
  if (shouldIgnore(el)) return;
  e.preventDefault();
  e.stopPropagation();

  const rect = el.getBoundingClientRect();
  state.pending = {
    el,
    startX: e.clientX,
    startY: e.clientY,
    offsetX: e.clientX - rect.left,
    offsetY: e.clientY - rect.top,
  };
}

function onMouseMove(e: MouseEvent): void {
  if (!state.active) return;

  if (state.dragging) {
    state.lastMouseX = e.clientX;
    state.lastMouseY = e.clientY;
    if (!state.rafId) {
      state.rafId = requestAnimationFrame(() => {
        state.rafId = 0;
        if (state.dragging) {
          const rawLeft = state.lastMouseX - state.dragging.offsetX;
          const rawTop = state.lastMouseY - state.dragging.offsetY;
          const pos = applySnap(rawLeft, rawTop, state.dragging.el.offsetWidth, state.dragging.el.offsetHeight);
          state.dragging.el.style.left = `${pos.left}px`;
          state.dragging.el.style.top = `${pos.top}px`;
        }
      });
    }
    return;
  }

  if (state.pending) {
    const dx = e.clientX - state.pending.startX;
    const dy = e.clientY - state.pending.startY;
    if (dx * dx + dy * dy > DRAG_THRESHOLD_SQ) {
      commitDrag(state.pending, e);
      state.pending = null;
    }
    return;
  }

  const el = e.target as HTMLElement;
  if (shouldIgnore(el) || el === state.hoveredEl) return;
  state.hoveredEl = el;
  renderHighlight(el);
}

function onMouseUp(): void {
  if (state.dragging) {
    finishDrag();
  }
  state.pending = null;
}

function onClick(e: MouseEvent): void {
  if (!state.active) return;
  e.preventDefault();
  e.stopPropagation();

  if (!state.dragging) {
    const el = e.target as HTMLElement;
    if (!shouldIgnore(el)) {
      setSelected(el);
    }
  }
}

function onDragStart(e: DragEvent): void {
  if (!state.active) return;
  e.preventDefault();
}

function onKeyDown(e: KeyboardEvent): void {
  if (!state.active) return;
  if (e.key === 'Escape') {
    if (state.dragging) {
      const el = state.dragging.el;
      const orig = state.movedElements.get(el);
      if (orig) {
        el.style.cssText = orig.cssText;
        orig.placeholder.remove();
        state.movedElements.delete(el);
      } else {
        el.style.position = '';
        el.style.zIndex = '';
      }
      state.dragging = null;
      state.pending = null;
      document.body.style.cursor = 'grab';
      document.body.style.userSelect = '';
      clearHighlight();
      clearSnapGuides();
      state.hoveredEl = null;
      setSelected(null);
    } else {
      state.pending = null;
      setSelected(null);
      resetAll();
    }
  }
}

function onScroll(): void {
  if (!state.active || state.dragging || state.pending) return;
  state.hoveredEl = null;
  clearHighlight();
}

function onWindowMouseLeave(e: MouseEvent): void {
  if (!state.active) return;
  if (e.relatedTarget !== null) return;
  if (state.dragging) finishDrag();
  state.pending = null;
}

// --- Public API ---

export function initDragCore(deps: { getSnapGrid: () => GridReport | null }): void {
  state.active = true;
  state.getGridReport = deps.getSnapGrid;
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
  cancelAnimationFrame(state.rafId);
  clearHighlight();
  clearSnapGuides();
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
  state = createInitialState();
}

export function nudgeElement(el: HTMLElement, dx: number, dy: number): void {
  promoteToFixed(el);
  const curLeft = parseFloat(el.style.left) || 0;
  const curTop = parseFloat(el.style.top) || 0;
  el.style.left = `${curLeft + dx}px`;
  el.style.top = `${curTop + dy}px`;
}
