import { getFeatureLayer } from '../../overlay-host';
import type { SpacingGuide, DistanceLabel } from '@shared/types';

let guideX: HTMLDivElement | null = null;
let guideY: HTMLDivElement | null = null;
let prevSnapX = false;
let prevSnapY = false;

// Spacing guide elements pool
let spacingEls: HTMLDivElement[] = [];
// Distance label elements pool
let distanceEls: HTMLDivElement[] = [];

export function renderSnapGuides(snapLineX: number | null, snapLineY: number | null): void {
  const layer = getFeatureLayer('drag');

  // Vertical guide (element edge/center snap)
  if (snapLineX !== null) {
    if (!guideX || !guideX.isConnected) {
      guideX = document.createElement('div');
      guideX.className = 'xray-snap-guide-v';
      guideX.style.opacity = '0';
      layer.appendChild(guideX);
    }
    guideX.style.left = `${snapLineX}px`;
    guideX.style.opacity = '1';

    if (!prevSnapX) {
      guideX.classList.remove('xray-snap-flash');
      void guideX.offsetWidth;
      guideX.classList.add('xray-snap-flash');
    }
    prevSnapX = true;
  } else {
    if (guideX) guideX.style.opacity = '0';
    prevSnapX = false;
  }

  // Horizontal guide (element edge/center snap)
  if (snapLineY !== null) {
    if (!guideY || !guideY.isConnected) {
      guideY = document.createElement('div');
      guideY.className = 'xray-snap-guide-h';
      guideY.style.opacity = '0';
      layer.appendChild(guideY);
    }
    guideY.style.top = `${snapLineY}px`;
    guideY.style.opacity = '1';

    if (!prevSnapY) {
      guideY.classList.remove('xray-snap-flash');
      void guideY.offsetWidth;
      guideY.classList.add('xray-snap-flash');
    }
    prevSnapY = true;
  } else {
    if (guideY) guideY.style.opacity = '0';
    prevSnapY = false;
  }
}

export function renderSpacingGuides(guides: SpacingGuide[]): void {
  const layer = getFeatureLayer('drag');

  // Reuse or create elements
  while (spacingEls.length < guides.length) {
    const el = document.createElement('div');
    el.className = 'xray-spacing-guide';
    layer.appendChild(el);
    spacingEls.push(el);
  }

  for (let i = 0; i < spacingEls.length; i++) {
    if (i < guides.length) {
      const g = guides[i];
      const el = spacingEls[i];
      if (!el.isConnected) layer.appendChild(el);

      if (g.axis === 'x') {
        // Horizontal spacing: vertical dashed line at midpoint
        const top = Math.min(g.refA.top, g.refB.top);
        const bottom = Math.max(g.refA.bottom, g.refB.bottom);
        el.style.cssText =
          `left:${g.position}px;top:${top}px;width:1px;height:${bottom - top}px;opacity:1;`;
      } else {
        // Vertical spacing: horizontal dashed line at midpoint
        const left = Math.min(g.refA.left, g.refB.left);
        const right = Math.max(g.refA.right, g.refB.right);
        el.style.cssText =
          `left:${left}px;top:${g.position}px;width:${right - left}px;height:1px;opacity:1;`;
      }
      // Show gap value
      el.textContent = `${Math.round(g.gap)}`;
    } else {
      spacingEls[i].style.opacity = '0';
      spacingEls[i].textContent = '';
    }
  }
}

export function renderDistanceLabels(labels: DistanceLabel[]): void {
  const layer = getFeatureLayer('drag');

  while (distanceEls.length < labels.length) {
    const el = document.createElement('div');
    el.className = 'xray-distance-label';
    layer.appendChild(el);
    distanceEls.push(el);
  }

  for (let i = 0; i < distanceEls.length; i++) {
    if (i < labels.length) {
      const l = labels[i];
      const el = distanceEls[i];
      if (!el.isConnected) layer.appendChild(el);

      const mid = (l.from + l.to) / 2;
      if (l.axis === 'x') {
        // Horizontal distance: label centered between from/to, at crossPos
        el.style.cssText =
          `left:${mid}px;top:${l.crossPos}px;opacity:1;transform:translate(-50%,-50%);`;
      } else {
        // Vertical distance: label centered between from/to, at crossPos
        el.style.cssText =
          `left:${l.crossPos}px;top:${mid}px;opacity:1;transform:translate(-50%,-50%);`;
      }
      el.textContent = `${Math.round(l.distance)}`;
    } else {
      distanceEls[i].style.opacity = '0';
      distanceEls[i].textContent = '';
    }
  }
}

export function clearSnapGuides(): void {
  if (guideX) { guideX.remove(); guideX = null; }
  if (guideY) { guideY.remove(); guideY = null; }
  prevSnapX = false;
  prevSnapY = false;
}

export function clearAllGuides(): void {
  clearSnapGuides();
  for (const el of spacingEls) el.remove();
  spacingEls = [];
  for (const el of distanceEls) el.remove();
  distanceEls = [];
}
