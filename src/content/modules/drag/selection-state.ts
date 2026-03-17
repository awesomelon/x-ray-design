import { getFeatureLayer } from '../../overlay-host';

type MoveCallback = (el: HTMLElement, dx: number, dy: number) => void;

let selectedEl: HTMLElement | null = null;
let highlightBox: HTMLDivElement | null = null;
let moveCallback: MoveCallback | null = null;

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function onKeyDown(e: KeyboardEvent): void {
  if (!selectedEl || !ARROW_KEYS.has(e.key)) return;

  e.preventDefault();
  e.stopPropagation();

  const step = e.shiftKey ? 10 : 1;
  const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
  const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;

  moveCallback?.(selectedEl, dx, dy);
  renderSelectionHighlight(selectedEl);
}

function renderSelectionHighlight(el: HTMLElement): void {
  const layer = getFeatureLayer('drag');
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  if (!highlightBox || !highlightBox.isConnected) {
    highlightBox = document.createElement('div');
    highlightBox.className = 'xray-drag-selected';
    layer.appendChild(highlightBox);
  }
  highlightBox.style.cssText =
    `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
}

export function setSelected(el: HTMLElement | null): void {
  selectedEl = el;
  if (el) {
    renderSelectionHighlight(el);
  } else {
    clearSelectionHighlight();
  }
}

export function getSelected(): HTMLElement | null {
  return selectedEl;
}

export function clearSelectionHighlight(): void {
  if (highlightBox) {
    highlightBox.remove();
    highlightBox = null;
  }
}

export function refreshSelectionHighlight(): void {
  if (selectedEl) renderSelectionHighlight(selectedEl);
}

export function mountKeyboardHandler(onMove: MoveCallback): void {
  moveCallback = onMove;
  document.addEventListener('keydown', onKeyDown, true);
}

export function unmountKeyboardHandler(): void {
  document.removeEventListener('keydown', onKeyDown, true);
  selectedEl = null;
  moveCallback = null;
  clearSelectionHighlight();
}
