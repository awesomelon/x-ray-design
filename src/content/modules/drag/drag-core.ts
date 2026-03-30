import { getFeatureLayer } from '../../overlay-host';
import { snapToElements, scanVisibleElements, invalidateScanCache, detectEqualSpacing, computeDistances, computeDirectDistance, makeElementRect } from './snap-engine';
import { renderSnapGuides, renderSpacingGuides, renderDistanceLabels, renderConnectorLines, clearAllGuides } from './snap-guides';
import {
  getSelected,
  replaceSelection,
  toggleSelected,
  clearSelectionHighlight,
  refreshSelectionHighlight,
  pruneStale,
} from './selection-state';

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
  cachedWidth: number;
  cachedHeight: number;
}

interface SecondaryDrag {
  el: HTMLElement;
  dx: number;
  dy: number;
}

// --- State ---
//
//  State machine:
//
//    IDLE ──mousedown(element)──▶ PENDING ──threshold──▶ DRAGGING ──mouseup──▶ IDLE
//     │                            │                       │
//     │                            └──mouseup──▶ IDLE      └──Esc──▶ IDLE (revert)
//     │
//     └──Esc──▶ IDLE (resetAll)
//

interface DragState {
  active: boolean;
  movedElements: Map<HTMLElement, OriginalState>;
  pending: PendingDrag | null;
  dragging: ActiveDrag | null;
  secondaries: SecondaryDrag[];
  draggedEls: Set<HTMLElement>;
  hoveredEl: HTMLElement | null;
  highlightBox: HTMLDivElement | null;
  rafId: number;
  lastMouseX: number;
  lastMouseY: number;
  wasSnappedX: boolean;
  wasSnappedY: boolean;
  altPressed: boolean;
  inspectRafId: number;
  lastInspectEl: HTMLElement | null;
}

function createInitialState(): DragState {
  return {
    active: false,
    movedElements: new Map(),
    pending: null,
    dragging: null,
    secondaries: [],
    draggedEls: new Set(),
    hoveredEl: null,
    highlightBox: null,
    rafId: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    wasSnappedX: false,
    wasSnappedY: false,
    altPressed: false,
    inspectRafId: 0,
    lastInspectEl: null,
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

export function promoteToFixed(el: HTMLElement): { offset: { x: number; y: number }; width: number; height: number } {
  const rect = el.getBoundingClientRect();
  const offset = getContainingBlockOffset(el);

  if (state.movedElements.has(el)) {
    return { offset, width: rect.width, height: rect.height };
  }

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

  el.style.position = 'fixed';
  el.style.left = `${rect.left - offset.x}px`;
  el.style.top = `${rect.top - offset.y}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.zIndex = '2147483646';
  el.style.margin = '0';
  el.style.boxSizing = 'border-box';

  return { offset, width: rect.width, height: rect.height };
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
  const elementRects = scanVisibleElements(state.draggedEls);

  if (elementRects.length === 0) {
    renderSnapGuides(null, null);
    renderSpacingGuides([]);
    renderDistanceLabels([]);
    return { left: rawLeft, top: rawTop };
  }

  const cbX = state.dragging?.cbOffsetX ?? 0;
  const cbY = state.dragging?.cbOffsetY ?? 0;
  const snapped = snapToElements(rawLeft + cbX, rawTop + cbY, w, h, elementRects);

  const snapTargetLeft = snapped.snapTargetLeft - cbX;
  const snapTargetTop = snapped.snapTargetTop - cbY;

  let finalLeft = rawLeft;
  let finalTop = rawTop;

  if (snapped.nearestGuideX !== null) {
    const xResult = magneticInterpolate(rawLeft, snapTargetLeft, snapped.nearestDistX, state.wasSnappedX);
    state.wasSnappedX = xResult.isSnapped;
    finalLeft = xResult.pos;
  } else {
    state.wasSnappedX = false;
  }

  if (snapped.nearestGuideY !== null) {
    const yResult = magneticInterpolate(rawTop, snapTargetTop, snapped.nearestDistY, state.wasSnappedY);
    state.wasSnappedY = yResult.isSnapped;
    finalTop = yResult.pos;
  } else {
    state.wasSnappedY = false;
  }

  renderSnapGuides(
    state.wasSnappedX ? snapped.nearestGuideX : null,
    state.wasSnappedY ? snapped.nearestGuideY : null,
  );

  const dragRect = makeElementRect(finalLeft + cbX, finalTop + cbY, w, h);
  const spacingX = detectEqualSpacing(dragRect, elementRects, 'x');
  const spacingY = detectEqualSpacing(dragRect, elementRects, 'y');
  renderSpacingGuides([...spacingX, ...spacingY]);

  const distances = computeDistances(dragRect, elementRects);
  renderDistanceLabels(distances);

  return { left: finalLeft, top: finalTop };
}

// --- Inspect mode ---

function showInspectDistances(hoveredEl: HTMLElement): void {
  const selectedSet = getSelected();
  const hoveredRect = hoveredEl.getBoundingClientRect();
  const hRect = makeElementRect(hoveredRect.left, hoveredRect.top, hoveredRect.width, hoveredRect.height);

  if (selectedSet.size > 0 && !selectedSet.has(hoveredEl)) {
    // Mode 2: Selection-aware — find closest selected element
    let closestEl: HTMLElement | null = null;
    let closestDist = Infinity;
    for (const sel of selectedSet) {
      const selRect = sel.getBoundingClientRect();
      const dx = (selRect.left + selRect.width / 2) - (hoveredRect.left + hoveredRect.width / 2);
      const dy = (selRect.top + selRect.height / 2) - (hoveredRect.top + hoveredRect.height / 2);
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closestEl = sel;
      }
    }
    if (closestEl) {
      const selBcr = closestEl.getBoundingClientRect();
      const sRect = makeElementRect(selBcr.left, selBcr.top, selBcr.width, selBcr.height);
      const labels = computeDirectDistance(sRect, hRect);
      renderDistanceLabels(labels);
      renderConnectorLines(labels);
      renderSpacingGuides([]);
      renderSnapGuides(null, null);
    }
  } else {
    // Mode 1: No selection (or hovering self) — show 4-direction neighbors
    // Invalidate cache if hover target's parent changed
    if (state.lastInspectEl && state.lastInspectEl.parentElement !== hoveredEl.parentElement) {
      invalidateScanCache();
    }
    state.lastInspectEl = hoveredEl;

    const elementRects = scanVisibleElements(new Set([hoveredEl]), true);
    if (elementRects.length === 0) {
      renderDistanceLabels([]);
      renderConnectorLines([]);
      return;
    }
    const labels = computeDistances(hRect, elementRects);
    renderDistanceLabels(labels);
    renderConnectorLines([]);
    renderSpacingGuides([]);
    renderSnapGuides(null, null);
  }
}

function clearInspect(): void {
  cancelAnimationFrame(state.inspectRafId);
  state.inspectRafId = 0;
  state.altPressed = false;
  state.lastInspectEl = null;
  clearAllGuides();
}

// --- Drag core ---

function commitDrag(pending: PendingDrag, e: MouseEvent): void {
  const { el, offsetX, offsetY } = pending;
  const selectedSet = getSelected();

  // If dragging a selected element in a multi-selection, do group drag
  const isGroupDrag = selectedSet.has(el) && selectedSet.size > 1;

  if (!isGroupDrag && !selectedSet.has(el)) {
    replaceSelection(el);
  }

  // Lazy cleanup: remove stale elements from selection + highlight boxes
  pruneStale();

  const { offset, width, height } = promoteToFixed(el);

  state.dragging = {
    el,
    offsetX: offsetX + offset.x,
    offsetY: offsetY + offset.y,
    cbOffsetX: offset.x,
    cbOffsetY: offset.y,
    cachedWidth: width,
    cachedHeight: height,
  };

  // Compute secondary offsets for group drag
  state.secondaries = [];
  state.draggedEls = new Set([el]);
  if (isGroupDrag) {
    const primaryRect = el.getBoundingClientRect();
    for (const sel of selectedSet) {
      if (sel === el) continue;
      state.draggedEls.add(sel);
      const { offset: selOffset } = promoteToFixed(sel);
      const selRect = sel.getBoundingClientRect();
      state.secondaries.push({
        el: sel,
        dx: (selRect.left - selOffset.x) - (primaryRect.left - offset.x),
        dy: (selRect.top - selOffset.y) - (primaryRect.top - offset.y),
      });
    }
  }

  const rawLeft = e.clientX - offsetX - offset.x;
  const rawTop = e.clientY - offsetY - offset.y;
  const pos = applySnap(rawLeft, rawTop, width, height);

  el.style.left = `${pos.left}px`;
  el.style.top = `${pos.top}px`;

  for (const sec of state.secondaries) {
    sec.el.style.left = `${pos.left + sec.dx}px`;
    sec.el.style.top = `${pos.top + sec.dy}px`;
  }

  clearHighlight();
  if (!isGroupDrag) clearSelectionHighlight();
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
  const wasGroupDrag = state.secondaries.length > 0;
  state.dragging = null;
  state.pending = null;
  state.secondaries = [];
  state.wasSnappedX = false;
  state.wasSnappedY = false;
  document.body.style.cursor = 'grab';
  document.body.style.userSelect = '';
  clearHighlight();
  clearAllGuides();
  invalidateScanCache();
  state.hoveredEl = null;

  if (wasGroupDrag) {
    refreshSelectionHighlight();
  } else {
    replaceSelection(el);
  }
}

// --- Event handlers ---

function onMouseDown(e: MouseEvent): void {
  if (!state.active || state.dragging) return;

  // Clear inspect mode on mousedown (drag takes priority)
  if (state.altPressed) {
    clearInspect();
    invalidateScanCache();
  }

  const el = e.target as HTMLElement;

  if (shouldIgnore(el)) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

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
          const pos = applySnap(rawLeft, rawTop, state.dragging.cachedWidth, state.dragging.cachedHeight);
          state.dragging.el.style.left = `${pos.left}px`;
          state.dragging.el.style.top = `${pos.top}px`;

          for (const sec of state.secondaries) {
            sec.el.style.left = `${pos.left + sec.dx}px`;
            sec.el.style.top = `${pos.top + sec.dy}px`;
          }

          if (state.secondaries.length > 0) refreshSelectionHighlight();
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

  // Inspect mode: show distances on Alt+hover
  if (state.altPressed && !state.dragging && !state.pending) {
    if (!state.inspectRafId) {
      state.inspectRafId = requestAnimationFrame(() => {
        state.inspectRafId = 0;
        if (state.altPressed && state.hoveredEl && !state.dragging) {
          showInspectDistances(state.hoveredEl);
        }
      });
    }
  }
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
      if (e.ctrlKey || e.metaKey) {
        toggleSelected(el);
      } else {
        replaceSelection(el);
      }
    } else {
      if (!(e.ctrlKey || e.metaKey)) {
        replaceSelection(null);
      }
    }
  }
}

function onDragStart(e: DragEvent): void {
  if (!state.active) return;
  e.preventDefault();
}

function onKeyDown(e: KeyboardEvent): void {
  if (!state.active) return;

  if (e.key === 'Alt' && !state.dragging) {
    state.altPressed = true;
    // Show distances immediately for current hover target
    if (state.hoveredEl) {
      showInspectDistances(state.hoveredEl);
    }
    return;
  }

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
      for (const sec of state.secondaries) {
        const secOrig = state.movedElements.get(sec.el);
        if (secOrig) {
          sec.el.style.cssText = secOrig.cssText;
          secOrig.placeholder.remove();
          state.movedElements.delete(sec.el);
        }
      }
      state.dragging = null;
      state.pending = null;
      state.secondaries = [];
      document.body.style.cursor = 'grab';
      document.body.style.userSelect = '';
      clearHighlight();
      clearAllGuides();
      invalidateScanCache();
      state.hoveredEl = null;
      replaceSelection(null);
    } else {
      state.pending = null;
      replaceSelection(null);
      resetAll();
    }
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (!state.active) return;
  if (e.key === 'Alt') {
    clearInspect();
  }
}

function onVisibilityChange(): void {
  if (document.hidden && state.altPressed) {
    clearInspect();
  }
}

function onWindowBlur(): void {
  if (state.altPressed) clearInspect();
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

export function initDragCore(): void {
  state.active = true;
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('dragstart', onDragStart, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('scroll', onScroll, true);
  document.addEventListener('mouseleave', onWindowMouseLeave);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onWindowBlur);
  document.body.style.cursor = 'grab';
}

export function teardownDragCore(): void {
  cancelAnimationFrame(state.rafId);
  cancelAnimationFrame(state.inspectRafId);
  clearHighlight();
  clearAllGuides();
  invalidateScanCache();
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('dragstart', onDragStart, true);
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('keyup', onKeyUp, true);
  document.removeEventListener('scroll', onScroll, true);
  document.removeEventListener('mouseleave', onWindowMouseLeave);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('blur', onWindowBlur);
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
