import { onSelectionChange, offSelectionChange, getSelected, refreshSelectionHighlight } from '../drag/selection-state';
import { showPopup, hidePopup, repositionPopup } from './popup';
import { applyProperty, type CSSProperty } from './css-applier';

let isDragging = false;
let currentEl: HTMLElement | null = null;

function handleSelectionChange(selected: ReadonlySet<HTMLElement>): void {
  if (isDragging) return;

  if (selected.size === 1) {
    const el = [...selected][0];
    currentEl = el;
    showPopup(el, handleUpdate);
  } else {
    currentEl = null;
    hidePopup();
  }
}

function handleUpdate(prop: CSSProperty, value: string): void {
  if (!currentEl) return;
  applyProperty(currentEl, prop, value);
  refreshSelectionHighlight();
}

function onMouseDown(): void {
  isDragging = true;
}

function onMouseUp(): void {
  isDragging = false;
}

function onKeyDown(e: KeyboardEvent): void {
  const active = document.activeElement;
  const deepActive = active?.shadowRoot?.activeElement ?? active;
  if (!deepActive || (deepActive.tagName !== 'INPUT' && deepActive.tagName !== 'TEXTAREA')) return;

  if (e.key === 'Escape') {
    (deepActive as HTMLElement).blur();
    return;
  }

  // Prevent arrow keys and other keys from reaching drag handlers
  if (e.key !== 'Tab') {
    e.stopPropagation();
  }
}

function onScroll(): void {
  repositionPopup();
}

export function initCssEditorCore(): void {
  onSelectionChange(handleSelectionChange);
  document.addEventListener('mousedown', onMouseDown, true);
  document.addEventListener('mouseup', onMouseUp, true);
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('scroll', onScroll, true);

  // Show popup for already-selected element
  const selected = getSelected();
  if (selected.size === 1) {
    const el = [...selected][0];
    currentEl = el;
    showPopup(el, handleUpdate);
  }
}

export function teardownCssEditorCore(): void {
  offSelectionChange(handleSelectionChange);
  document.removeEventListener('mousedown', onMouseDown, true);
  document.removeEventListener('mouseup', onMouseUp, true);
  document.removeEventListener('keydown', onKeyDown, true);
  document.removeEventListener('scroll', onScroll, true);
  hidePopup();
  currentEl = null;
  isDragging = false;
}
