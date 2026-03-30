import { getFeatureLayer } from '../../overlay-host';

type MoveCallback = (el: HTMLElement, dx: number, dy: number) => void;

const selectedSet = new Set<HTMLElement>();
const highlightBoxes = new Map<HTMLElement, HTMLDivElement>();
let moveCallback: MoveCallback | null = null;

type SelectionObserver = (selected: ReadonlySet<HTMLElement>) => void;
const observers = new Set<SelectionObserver>();

export function onSelectionChange(cb: SelectionObserver): void { observers.add(cb); }
export function offSelectionChange(cb: SelectionObserver): void { observers.delete(cb); }
function notifyObservers(): void { for (const cb of observers) cb(selectedSet); }

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

function onKeyDown(e: KeyboardEvent): void {
  if (selectedSet.size === 0 || !ARROW_KEYS.has(e.key)) return;
  const active = document.activeElement;
  const deepActive = active?.shadowRoot?.activeElement ?? active;
  if (deepActive && (deepActive.tagName === 'INPUT' || deepActive.tagName === 'TEXTAREA')) return;

  e.preventDefault();
  e.stopPropagation();

  const step = e.shiftKey ? 10 : 1;
  const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
  const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;

  for (const el of selectedSet) {
    moveCallback?.(el, dx, dy);
  }
  renderAllHighlights();
}

function renderHighlightFor(el: HTMLElement): void {
  const layer = getFeatureLayer('drag');
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  let box = highlightBoxes.get(el);
  if (!box || !box.isConnected) {
    box = document.createElement('div');
    box.className = 'xray-drag-selected';
    layer.appendChild(box);
    highlightBoxes.set(el, box);
  }
  box.style.cssText =
    `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
}

function renderAllHighlights(): void {
  for (const el of selectedSet) {
    renderHighlightFor(el);
  }
}

export function toggleSelected(el: HTMLElement): void {
  if (selectedSet.has(el)) {
    selectedSet.delete(el);
    const box = highlightBoxes.get(el);
    if (box) {
      box.remove();
      highlightBoxes.delete(el);
    }
  } else {
    selectedSet.add(el);
    renderHighlightFor(el);
  }
  notifyObservers();
}

export function replaceSelection(el: HTMLElement | null): void {
  clearSelectionHighlight();
  selectedSet.clear();
  if (el) {
    selectedSet.add(el);
    renderHighlightFor(el);
  }
  notifyObservers();
}

export function getSelected(): ReadonlySet<HTMLElement> {
  return selectedSet;
}

/** Remove disconnected elements from selection and their highlight boxes. */
export function pruneStale(): void {
  for (const el of selectedSet) {
    if (!el.isConnected) {
      selectedSet.delete(el);
      const box = highlightBoxes.get(el);
      if (box) { box.remove(); highlightBoxes.delete(el); }
    }
  }
}

export function clearSelectionHighlight(): void {
  for (const box of highlightBoxes.values()) {
    box.remove();
  }
  highlightBoxes.clear();
}

export function refreshSelectionHighlight(): void {
  renderAllHighlights();
}

export function mountKeyboardHandler(onMove: MoveCallback): void {
  moveCallback = onMove;
  document.addEventListener('keydown', onKeyDown, true);
}

export function unmountKeyboardHandler(): void {
  document.removeEventListener('keydown', onKeyDown, true);
  selectedSet.clear();
  moveCallback = null;
  clearSelectionHighlight();
}
