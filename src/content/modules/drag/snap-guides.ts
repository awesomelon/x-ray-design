import { getFeatureLayer } from '../../overlay-host';

let guideX: HTMLDivElement | null = null;
let guideY: HTMLDivElement | null = null;
let prevSnapX = false;
let prevSnapY = false;

export function renderSnapGuides(snapLineX: number | null, snapLineY: number | null): void {
  const layer = getFeatureLayer('drag');

  // Vertical guide (column edge snap)
  if (snapLineX !== null) {
    if (!guideX || !guideX.isConnected) {
      guideX = document.createElement('div');
      guideX.className = 'xray-snap-guide-v';
      layer.appendChild(guideX);
    }
    guideX.style.left = `${snapLineX}px`;
    guideX.style.display = '';

    // 스냅 진입 시 flash 애니메이션
    if (!prevSnapX) {
      guideX.classList.remove('xray-snap-flash');
      void guideX.offsetWidth; // reflow 강제 (애니메이션 리트리거)
      guideX.classList.add('xray-snap-flash');
    }
    prevSnapX = true;
  } else {
    if (guideX) guideX.style.display = 'none';
    prevSnapX = false;
  }

  // Horizontal guide (baseline snap)
  if (snapLineY !== null) {
    if (!guideY || !guideY.isConnected) {
      guideY = document.createElement('div');
      guideY.className = 'xray-snap-guide-h';
      layer.appendChild(guideY);
    }
    guideY.style.top = `${snapLineY}px`;
    guideY.style.display = '';

    if (!prevSnapY) {
      guideY.classList.remove('xray-snap-flash');
      void guideY.offsetWidth;
      guideY.classList.add('xray-snap-flash');
    }
    prevSnapY = true;
  } else {
    if (guideY) guideY.style.display = 'none';
    prevSnapY = false;
  }
}

export function clearSnapGuides(): void {
  if (guideX) { guideX.remove(); guideX = null; }
  if (guideY) { guideY.remove(); guideY = null; }
  prevSnapX = false;
  prevSnapY = false;
}
