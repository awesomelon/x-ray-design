import { getFeatureLayer } from '../../overlay-host';
import { CSS_PROPS, readProperties, type CSSProperty } from './css-applier';

const POPUP_GAP = 12;
const POPUP_WIDTH = 200;

let popupEl: HTMLDivElement | null = null;
let currentTarget: HTMLElement | null = null;
let inputMap = new Map<CSSProperty, HTMLInputElement>();

export function showPopup(
  el: HTMLElement,
  onUpdate: (prop: CSSProperty, value: string) => void,
): void {
  const layer = getFeatureLayer('css-editor');
  currentTarget = el;

  if (popupEl && popupEl.isConnected) {
    updateInputValues(el);
    reposition(el);
    return;
  }

  popupEl = document.createElement('div');
  popupEl.className = 'xray-css-editor';
  inputMap.clear();

  const values = readProperties(el);

  for (const def of CSS_PROPS) {
    const row = document.createElement('div');
    row.className = 'xray-css-editor-row';

    const label = document.createElement('label');
    label.textContent = def.label;

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.value = values[def.prop];
    input.addEventListener('input', () => {
      onUpdate(def.prop, input.value);
    });
    // Prevent drag-core from intercepting clicks/mousedown on inputs
    input.addEventListener('mousedown', (e) => e.stopPropagation());
    input.addEventListener('click', (e) => e.stopPropagation());

    inputMap.set(def.prop, input);
    row.appendChild(label);
    row.appendChild(input);
    popupEl.appendChild(row);
  }

  layer.appendChild(popupEl);
  reposition(el);
}

export function hidePopup(): void {
  if (popupEl) {
    popupEl.remove();
    popupEl = null;
  }
  currentTarget = null;
  inputMap.clear();
}

export function repositionPopup(): void {
  if (currentTarget && popupEl) {
    reposition(currentTarget);
  }
}

function updateInputValues(el: HTMLElement): void {
  const values = readProperties(el);
  const deepActive = document.activeElement?.shadowRoot?.activeElement ?? document.activeElement;
  for (const [prop, input] of inputMap) {
    if (deepActive !== input) {
      input.value = values[prop];
    }
  }
}

function reposition(el: HTMLElement): void {
  if (!popupEl) return;
  const rect = el.getBoundingClientRect();
  const popupHeight = popupEl.offsetHeight || 300;

  let left = rect.right + POPUP_GAP;
  let top = rect.top;

  // Flip to left side if overflowing right
  if (left + POPUP_WIDTH + POPUP_GAP > document.documentElement.clientWidth) {
    left = rect.left - POPUP_WIDTH - POPUP_GAP;
  }

  // Clamp vertical
  if (top + popupHeight > window.innerHeight - 8) {
    top = window.innerHeight - popupHeight - 8;
  }
  if (top < 8) top = 8;

  popupEl.style.left = `${left}px`;
  popupEl.style.top = `${top}px`;
}
