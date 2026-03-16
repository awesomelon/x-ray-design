import { getFeatureLayer, clearFeatureLayer, removeFeatureLayer } from '../overlay-host';

const IGNORE_TAGS = new Set([
  'HTML', 'BODY', 'HEAD', 'SCRIPT', 'STYLE', 'LINK', 'META', 'NOSCRIPT', 'BR',
]);

const DRAG_THRESHOLD_SQ = 9; // 3px squared

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

function shouldIgnore(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return true;
  if (IGNORE_TAGS.has(el.tagName)) return true;
  if (el.closest('x-ray-overlay')) return true;
  return false;
}

/**
 * CSS 사양상 fixed 포지셔닝의 containing block을 형성하는 조상 속성 체크.
 * transform, filter, perspective, will-change, contain 등이 해당.
 */
function createsContainingBlock(style: CSSStyleDeclaration): boolean {
  if (style.transform !== 'none') return true;
  if (style.filter !== 'none') return true;
  if (style.perspective !== 'none') return true;
  const wc = style.willChange;
  if (wc === 'transform' || wc === 'filter' || wc === 'perspective') return true;
  const ct = style.contain;
  if (ct.includes('layout') || ct.includes('paint') || ct === 'strict' || ct === 'content') return true;
  return false;
}

/**
 * fixed 포지셔닝의 containing block이 되는 가장 가까운 조상의 offset을 반환한다.
 */
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

// --- Highlight (reuse single DOM element) ---

function renderHighlight(el: HTMLElement): void {
  const layer = getFeatureLayer('drag');
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  if (!highlightBox || !highlightBox.isConnected) {
    highlightBox = document.createElement('div');
    highlightBox.className = 'xray-drag-highlight';
    layer.appendChild(highlightBox);
  }
  highlightBox.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
}

function clearHighlight(): void {
  if (highlightBox) {
    highlightBox.remove();
    highlightBox = null;
  }
}

// --- Drag core ---

function commitDrag(pending: PendingDrag, e: MouseEvent): void {
  const { el, offsetX, offsetY } = pending;
  const rect = el.getBoundingClientRect();
  const computed = getComputedStyle(el);

  if (!movedElements.has(el)) {
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
  }

  const offset = getContainingBlockOffset(el);

  el.style.position = 'fixed';
  el.style.left = `${e.clientX - offsetX - offset.x}px`;
  el.style.top = `${e.clientY - offsetY - offset.y}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  el.style.zIndex = '2147483646';
  el.style.margin = '0';
  el.style.boxSizing = 'border-box';

  activeDrag = { el, offsetX: offsetX + offset.x, offsetY: offsetY + offset.y };
  clearHighlight();
  clearFeatureLayer('drag');
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
  activeDrag = null;
  pendingDrag = null;
  document.body.style.cursor = 'grab';
  document.body.style.userSelect = '';
  clearHighlight();
  clearFeatureLayer('drag');
  hoveredEl = null;
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
          activeDrag.el.style.left = `${lastMouseX - activeDrag.offsetX}px`;
          activeDrag.el.style.top = `${lastMouseY - activeDrag.offsetY}px`;
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

  // Hover highlight
  const el = e.target as HTMLElement;
  if (shouldIgnore(el) || el === hoveredEl) return;
  hoveredEl = el;
  renderHighlight(el);
}

function onMouseUp(): void {
  finishDrag();
  pendingDrag = null;
}

function onClick(e: MouseEvent): void {
  if (!active) return;
  e.preventDefault();
  e.stopPropagation();
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
        // 방어: state가 없으면 fixed 스타일만 제거
        el.style.position = '';
        el.style.zIndex = '';
      }
      finishDrag();
    } else {
      pendingDrag = null;
      resetAll();
    }
  }
}

function onScroll(): void {
  if (!active || activeDrag || pendingDrag) return;
  // 스크롤 시 마우스 아래의 요소가 바뀔 수 있으므로 highlight를 초기화
  hoveredEl = null;
  clearHighlight();
  clearFeatureLayer('drag');
}

// window 밖으로 마우스가 나갔을 때 드래그 해제
function onWindowMouseLeave(e: MouseEvent): void {
  if (!active) return;
  if (e.relatedTarget !== null) return;
  // 브라우저 창 밖으로 나간 경우
  if (activeDrag) finishDrag();
  pendingDrag = null;
}

export function activateDrag(): void {
  active = true;
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

export function deactivateDrag(): void {
  active = false;
  cancelAnimationFrame(dragRafId);
  dragRafId = 0;
  activeDrag = null;
  pendingDrag = null;
  hoveredEl = null;
  highlightBox = null;
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
  removeFeatureLayer('drag');
}
