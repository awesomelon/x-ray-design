import { getFeatureLayer, clearFeatureLayer, removeFeatureLayer } from '../overlay-host';

let injectedStyle: HTMLStyleElement | null = null;
const placeholders: HTMLElement[] = [];
const originalState = new WeakMap<HTMLElement, { display: string }>();
let observer: MutationObserver | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let rafId = 0;

function scheduleRefresh(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      clearFeatureLayer('skeleton');
      renderSpacingOverlays();
    });
  }, 150);
}

// resize만 리스닝. scroll은 position:fixed이므로 불필요
const onResize = () => scheduleRefresh();

const SKELETON_CSS = `
body.xray-skeleton-active,
body.xray-skeleton-active * {
  background-image: none !important;
  background-color: #ffffff !important;
  box-shadow: none !important;
  text-shadow: none !important;
  color: #333333 !important;
  border-color: #d0d0d0 !important;
}
body.xray-skeleton-active img,
body.xray-skeleton-active video,
body.xray-skeleton-active svg {
  opacity: 0 !important;
}
`;

function createPlaceholder(el: HTMLElement): HTMLElement {
  const rect = el.getBoundingClientRect();
  const placeholder = document.createElement('div');
  placeholder.className = 'xray-media-placeholder';
  placeholder.style.cssText = `
    width: ${rect.width}px;
    height: ${rect.height}px;
    background: repeating-linear-gradient(
      45deg, #ccc, #ccc 5px, #eee 5px, #eee 10px
    );
    border: 1px solid #bbb;
    display: flex;
    align-items: center;
    justify-content: center;
    font: 11px/1 monospace;
    color: #888;
    box-sizing: border-box;
  `;
  placeholder.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
  return placeholder;
}

function replaceMediaElements(): void {
  const mediaElements = document.querySelectorAll<HTMLElement>('img, video, svg');
  for (const el of mediaElements) {
    if (originalState.has(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;

    originalState.set(el, { display: el.style.display });
    const placeholder = createPlaceholder(el);
    el.parentNode?.insertBefore(placeholder, el.nextSibling);
    placeholders.push(placeholder);
  }
}

function renderSpacingOverlays(): void {
  const layer = getFeatureLayer('skeleton');
  const allElements = document.querySelectorAll<HTMLElement>('body *');
  const fragment = document.createDocumentFragment();
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;

  for (const el of allElements) {
    if (el.closest('x-ray-overlay')) continue;

    // getBoundingClientRect를 먼저 호출하여 뷰포트 밖 요소를 조기 스킵
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    if (rect.bottom < -50 || rect.top > viewportH + 50 ||
        rect.right < -50 || rect.left > viewportW + 50) continue;

    const style = getComputedStyle(el);

    const mt = parseFloat(style.marginTop);
    const mr = parseFloat(style.marginRight);
    const mb = parseFloat(style.marginBottom);
    const ml = parseFloat(style.marginLeft);

    if (mt > 0) fragment.appendChild(createSpacingDiv('xray-margin-overlay', rect.left, rect.top - mt, rect.width, mt, mt));
    if (mb > 0) fragment.appendChild(createSpacingDiv('xray-margin-overlay', rect.left, rect.bottom, rect.width, mb, mb));
    if (ml > 0) fragment.appendChild(createSpacingDiv('xray-margin-overlay', rect.left - ml, rect.top, ml, rect.height, ml));
    if (mr > 0) fragment.appendChild(createSpacingDiv('xray-margin-overlay', rect.right, rect.top, mr, rect.height, mr));

    const pt = parseFloat(style.paddingTop);
    const pr = parseFloat(style.paddingRight);
    const pb = parseFloat(style.paddingBottom);
    const pl = parseFloat(style.paddingLeft);

    if (pt > 0) fragment.appendChild(createSpacingDiv('xray-padding-overlay', rect.left, rect.top, rect.width, pt, pt));
    if (pb > 0) fragment.appendChild(createSpacingDiv('xray-padding-overlay', rect.left, rect.bottom - pb, rect.width, pb, pb));
    if (pl > 0) fragment.appendChild(createSpacingDiv('xray-padding-overlay', rect.left, rect.top, pl, rect.height, pl));
    if (pr > 0) fragment.appendChild(createSpacingDiv('xray-padding-overlay', rect.right - pr, rect.top, pr, rect.height, pr));
  }

  layer.appendChild(fragment);
}

function createSpacingDiv(
  className: string,
  left: number,
  top: number,
  width: number,
  height: number,
  value: number
): HTMLDivElement {
  const div = document.createElement('div');
  div.className = className;
  div.style.left = `${left}px`;
  div.style.top = `${top}px`;
  div.style.width = `${width}px`;
  div.style.height = `${height}px`;

  const isMargin = className.includes('margin');
  const label = document.createElement('span');
  label.className = `xray-spacing-label ${isMargin ? 'xray-spacing-label--margin' : 'xray-spacing-label--padding'}`;
  label.textContent = `${Math.round(value)}px`;

  if (height < 16) {
    label.classList.add('xray-spacing-label--float');
  }

  div.appendChild(label);
  return div;
}

export function activateSkeleton(): void {
  if (injectedStyle) return;

  injectedStyle = document.createElement('style');
  injectedStyle.id = 'xray-skeleton-style';
  injectedStyle.textContent = SKELETON_CSS;
  document.head.appendChild(injectedStyle);
  document.body.classList.add('xray-skeleton-active');

  replaceMediaElements();
  renderSpacingOverlays();

  window.addEventListener('resize', onResize);

  // MutationObserver 디바운스 공유
  observer = new MutationObserver(() => scheduleRefresh());
  observer.observe(document.body, { childList: true, subtree: true });
}

export function deactivateSkeleton(): void {
  injectedStyle?.remove();
  injectedStyle = null;
  document.body.classList.remove('xray-skeleton-active');

  placeholders.forEach((ph) => ph.remove());
  placeholders.length = 0;

  window.removeEventListener('resize', onResize);
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  cancelAnimationFrame(rafId);

  removeFeatureLayer('skeleton');

  observer?.disconnect();
  observer = null;
}
