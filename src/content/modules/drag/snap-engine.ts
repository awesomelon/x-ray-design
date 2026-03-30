import type { ElementRect, SpacingGuide, DistanceLabel } from '@shared/types';

export const SNAP_THRESHOLD = 8;
const DISTANCE_MAX_RANGE = 200;

export function makeElementRect(left: number, top: number, width: number, height: number): ElementRect {
  return {
    left, top, width, height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

export function overlapMidpoint(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
  const start = Math.max(aStart, bStart);
  return start + (Math.min(aEnd, bEnd) - start) / 2;
}

export interface SnapResult {
  left: number;
  top: number;
  snappedX: boolean;
  snappedY: boolean;
  guideX: number | null;
  guideY: number | null;
  // Magnetic snap support
  snapTargetLeft: number;
  snapTargetTop: number;
  nearestDistX: number;
  nearestDistY: number;
  nearestGuideX: number | null;
  nearestGuideY: number | null;
}

export interface AxisSnapResult {
  value: number;
  snapped: boolean;
  fromA: boolean;
  guideLine: number | null;
  nearestDist: number;
  nearestLine: number | null;
  nearestFromA: boolean;
}

export function findNearest(value: number, lines: number[]): { nearest: number; dist: number } {
  let nearest = lines[0];
  let minDist = Math.abs(value - nearest);
  for (let i = 1; i < lines.length; i++) {
    const dist = Math.abs(value - lines[i]);
    if (dist < minDist) {
      nearest = lines[i];
      minDist = dist;
    }
  }
  return { nearest, dist: minDist };
}

export function snapAxisToLines(
  edgeA: number,
  edgeB: number,
  lines: number[],
  threshold: number,
): AxisSnapResult {
  if (lines.length === 0) {
    return {
      value: edgeA, snapped: false, fromA: true, guideLine: null,
      nearestDist: Infinity, nearestLine: null, nearestFromA: true,
    };
  }

  const snapA = findNearest(edgeA, lines);
  const snapB = findNearest(edgeB, lines);

  const nearest = snapA.dist <= snapB.dist
    ? { dist: snapA.dist, line: snapA.nearest, fromA: true }
    : { dist: snapB.dist, line: snapB.nearest, fromA: false };

  if (snapA.dist <= threshold && snapA.dist <= snapB.dist) {
    return {
      value: snapA.nearest, snapped: true, fromA: true, guideLine: snapA.nearest,
      nearestDist: nearest.dist, nearestLine: nearest.line, nearestFromA: nearest.fromA,
    };
  }
  if (snapB.dist <= threshold) {
    return {
      value: snapB.nearest, snapped: true, fromA: false, guideLine: snapB.nearest,
      nearestDist: nearest.dist, nearestLine: nearest.line, nearestFromA: nearest.fromA,
    };
  }
  return {
    value: edgeA, snapped: false, fromA: true, guideLine: null,
    nearestDist: nearest.dist, nearestLine: nearest.line, nearestFromA: nearest.fromA,
  };
}

// --- Scan cache ---
let cachedRects: ElementRect[] = [];
let cachedLines: { xLines: number[]; yLines: number[] } = { xLines: [], yLines: [] };
let cachedScrollX = -1;
let cachedScrollY = -1;

export function scanVisibleElements(draggedEls: Set<HTMLElement>, skipLargeFilter = false): ElementRect[] {
  try {
    // Invalidate cache when scroll position changes
    const sx = window.scrollX;
    const sy = window.scrollY;
    if (sx === cachedScrollX && sy === cachedScrollY && cachedRects.length > 0) {
      return cachedRects;
    }
    cachedScrollX = sx;
    cachedScrollY = sy;

    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const seen = new Set<Element>();
    const rects: ElementRect[] = [];

    // Mark dragged elements so we can skip them
    for (const el of draggedEls) {
      seen.add(el);
    }

    for (const dragEl of draggedEls) {
      const parent = dragEl.parentElement;
      if (!parent) continue;

      for (const child of parent.children) {
        if (seen.has(child)) continue;
        seen.add(child);
        const r = filterAndMakeRect(child as HTMLElement, vpW, vpH, skipLargeFilter);
        if (r) rects.push(r);
      }

      // Parent itself as container boundary
      if (!seen.has(parent)) {
        seen.add(parent);
        const r = filterAndMakeRect(parent, vpW, vpH, skipLargeFilter);
        if (r) rects.push(r);
      }

      // Grandparent level: uncle/aunt elements
      const grandparent = parent.parentElement;
      if (grandparent) {
        for (const uncle of grandparent.children) {
          if (seen.has(uncle) || uncle === parent) continue;
          seen.add(uncle);
          const r = filterAndMakeRect(uncle as HTMLElement, vpW, vpH, skipLargeFilter);
          if (r) rects.push(r);
        }
      }
    }

    cachedRects = rects;
    cachedLines = collectSnapLines(rects);
    return rects;
  } catch {
    return [];
  }
}

export function filterAndMakeRect(
  el: HTMLElement,
  viewportWidth: number,
  viewportHeight: number,
  skipLargeFilter = false,
): ElementRect | null {
  const r = el.getBoundingClientRect();
  if (r.width < 5 || r.height < 5) return null;
  if (!skipLargeFilter && r.width > viewportWidth * 0.8 && r.height > viewportHeight * 0.8) return null;
  return makeElementRect(r.left, r.top, r.width, r.height);
}

export function invalidateScanCache(): void {
  cachedRects = [];
  cachedLines = { xLines: [], yLines: [] };
  cachedScrollX = -1;
  cachedScrollY = -1;
}

export function collectSnapLines(rects: ElementRect[]): { xLines: number[]; yLines: number[] } {
  const rawX: number[] = [];
  const rawY: number[] = [];

  for (const r of rects) {
    rawX.push(r.left, r.right, r.centerX);
    rawY.push(r.top, r.bottom, r.centerY);
  }

  return {
    xLines: deduplicateAndSort(rawX),
    yLines: deduplicateAndSort(rawY),
  };
}

function deduplicateAndSort(values: number[]): number[] {
  if (values.length === 0) return [];
  const sorted = values.slice().sort((a, b) => a - b);
  const result: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i] - result[result.length - 1]) > 0.5) {
      result.push(sorted[i]);
    }
  }
  return result;
}

export function snapToElements(
  left: number,
  top: number,
  width: number,
  height: number,
  rects: ElementRect[],
): SnapResult {
  // Use cached lines when rects match the scan cache; fall back to fresh computation
  const { xLines, yLines } = rects === cachedRects && cachedLines.xLines.length > 0
    ? cachedLines
    : collectSnapLines(rects);

  const right = left + width;
  const bottom = top + height;
  const centerX = left + width / 2;
  const centerY = top + height / 2;

  // Edge snapping
  const xEdgeSnap = snapAxisToLines(left, right, xLines, SNAP_THRESHOLD);
  const yEdgeSnap = snapAxisToLines(top, bottom, yLines, SNAP_THRESHOLD);

  // Center snapping — check dragged element's center against snap lines
  let xResult = xEdgeSnap;
  if (xLines.length > 0) {
    const centerSnap = findNearest(centerX, xLines);
    if (centerSnap.dist <= SNAP_THRESHOLD) {
      // Center snap is viable; prefer it if closer than edge snap
      const edgeBestDist = xEdgeSnap.nearestDist;
      if (centerSnap.dist < edgeBestDist) {
        const snappedLeft = centerSnap.nearest - width / 2;
        xResult = {
          value: snappedLeft,
          snapped: true,
          fromA: true, // position is expressed as left
          guideLine: centerSnap.nearest,
          nearestDist: centerSnap.dist,
          nearestLine: centerSnap.nearest,
          nearestFromA: true,
        };
      }
    }
  }

  let yResult = yEdgeSnap;
  if (yLines.length > 0) {
    const centerSnap = findNearest(centerY, yLines);
    if (centerSnap.dist <= SNAP_THRESHOLD) {
      const edgeBestDist = yEdgeSnap.nearestDist;
      if (centerSnap.dist < edgeBestDist) {
        const snappedTop = centerSnap.nearest - height / 2;
        yResult = {
          value: snappedTop,
          snapped: true,
          fromA: true,
          guideLine: centerSnap.nearest,
          nearestDist: centerSnap.dist,
          nearestLine: centerSnap.nearest,
          nearestFromA: true,
        };
      }
    }
  }

  // Build SnapResult
  const resultLeft = xResult.snapped
    ? (xResult === xEdgeSnap
        ? (xResult.fromA ? xResult.value : xResult.value - width)
        : xResult.value)
    : left;

  const resultTop = yResult.snapped
    ? (yResult === yEdgeSnap
        ? (yResult.fromA ? yResult.value : yResult.value - height)
        : yResult.value)
    : top;

  // snapTarget: the position if we were to fully snap (for magnetic interpolation)
  let snapTargetLeft: number;
  if (xResult.nearestLine !== null) {
    if (xResult === xEdgeSnap) {
      snapTargetLeft = xResult.nearestFromA ? xResult.nearestLine : xResult.nearestLine - width;
    } else {
      // center snap
      snapTargetLeft = xResult.nearestLine - width / 2;
    }
  } else {
    snapTargetLeft = left;
  }

  let snapTargetTop: number;
  if (yResult.nearestLine !== null) {
    if (yResult === yEdgeSnap) {
      snapTargetTop = yResult.nearestFromA ? yResult.nearestLine : yResult.nearestLine - height;
    } else {
      snapTargetTop = yResult.nearestLine - height / 2;
    }
  } else {
    snapTargetTop = top;
  }

  return {
    left: resultLeft,
    top: resultTop,
    snappedX: xResult.snapped,
    snappedY: yResult.snapped,
    guideX: xResult.guideLine,
    guideY: yResult.guideLine,
    snapTargetLeft,
    snapTargetTop,
    nearestDistX: xResult.nearestDist,
    nearestDistY: yResult.nearestDist,
    nearestGuideX: xResult.nearestLine,
    nearestGuideY: yResult.nearestLine,
  };
}

export function detectEqualSpacing(
  dragRect: ElementRect,
  otherRects: ElementRect[],
  axis: 'x' | 'y',
): SpacingGuide[] {
  if (otherRects.length < 2) return [];

  const guides: SpacingGuide[] = [];

  // Sort elements by position on the given axis
  const sorted = [...otherRects].sort((a, b) => {
    return axis === 'x' ? a.left - b.left : a.top - b.top;
  });

  // Compute gaps between consecutive sorted elements
  const pairGaps: { gap: number; a: ElementRect; b: ElementRect }[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const gap = axis === 'x' ? b.left - a.right : b.top - a.bottom;
    if (gap > 0) {
      pairGaps.push({ gap, a, b });
    }
  }

  // Find drag element's neighbors
  const dragStart = axis === 'x' ? dragRect.left : dragRect.top;
  const dragEnd = axis === 'x' ? dragRect.right : dragRect.bottom;

  // Left/top neighbors: elements whose right/bottom edge is to the left/above of dragRect
  const before = sorted.filter(r =>
    axis === 'x' ? r.right <= dragStart : r.bottom <= dragStart,
  );
  // Right/bottom neighbors: elements whose left/top edge is to the right/below of dragRect
  const after = sorted.filter(r =>
    axis === 'x' ? r.left >= dragEnd : r.top >= dragEnd,
  );

  const nearestBefore = before.length > 0 ? before[before.length - 1] : null;
  const nearestAfter = after.length > 0 ? after[0] : null;

  // Gap from drag element to its immediate neighbors
  const gapBefore = nearestBefore
    ? (axis === 'x' ? dragRect.left - nearestBefore.right : dragRect.top - nearestBefore.bottom)
    : null;
  const gapAfter = nearestAfter
    ? (axis === 'x' ? nearestAfter.left - dragRect.right : nearestAfter.top - dragRect.bottom)
    : null;

  // Check if gap between drag and neighbor matches any gap between other pairs
  for (const pair of pairGaps) {
    if (gapBefore !== null && Math.abs(gapBefore - pair.gap) <= 1) {
      const pos = axis === 'x'
        ? nearestBefore!.right + gapBefore / 2
        : nearestBefore!.bottom + gapBefore / 2;
      guides.push({
        axis,
        position: pos,
        gap: gapBefore,
        refA: nearestBefore!,
        refB: dragRect,
      });
    }
    if (gapAfter !== null && Math.abs(gapAfter - pair.gap) <= 1) {
      const pos = axis === 'x'
        ? dragRect.right + gapAfter / 2
        : dragRect.bottom + gapAfter / 2;
      guides.push({
        axis,
        position: pos,
        gap: gapAfter,
        refA: dragRect,
        refB: nearestAfter!,
      });
    }
  }

  // Also check if gapBefore matches gapAfter
  if (gapBefore !== null && gapAfter !== null && Math.abs(gapBefore - gapAfter) <= 1) {
    const posBefore = axis === 'x'
      ? nearestBefore!.right + gapBefore / 2
      : nearestBefore!.bottom + gapBefore / 2;
    const posAfter = axis === 'x'
      ? dragRect.right + gapAfter / 2
      : dragRect.bottom + gapAfter / 2;

    // Only add if not already present (avoid duplicates)
    const hasBefore = guides.some(g =>
      Math.abs(g.position - posBefore) < 1 && g.refA === nearestBefore && g.refB === dragRect,
    );
    if (!hasBefore) {
      guides.push({
        axis,
        position: posBefore,
        gap: gapBefore,
        refA: nearestBefore!,
        refB: dragRect,
      });
    }
    const hasAfter = guides.some(g =>
      Math.abs(g.position - posAfter) < 1 && g.refA === dragRect && g.refB === nearestAfter,
    );
    if (!hasAfter) {
      guides.push({
        axis,
        position: posAfter,
        gap: gapAfter,
        refA: dragRect,
        refB: nearestAfter!,
      });
    }
  }

  return guides;
}

export function computeDistances(
  dragRect: ElementRect,
  otherRects: ElementRect[],
): DistanceLabel[] {
  const labels: DistanceLabel[] = [];

  let bestLeft: { rect: ElementRect; dist: number } | null = null;
  let bestRight: { rect: ElementRect; dist: number } | null = null;
  let bestUp: { rect: ElementRect; dist: number } | null = null;
  let bestDown: { rect: ElementRect; dist: number } | null = null;

  for (const r of otherRects) {
    const vOverlap = r.bottom > dragRect.top && r.top < dragRect.bottom;
    const hOverlap = r.right > dragRect.left && r.left < dragRect.right;

    if (vOverlap && r.right <= dragRect.left) {
      const dist = dragRect.left - r.right;
      if (dist <= DISTANCE_MAX_RANGE && (!bestLeft || dist < bestLeft.dist)) {
        bestLeft = { rect: r, dist };
      }
    }

    if (vOverlap && r.left >= dragRect.right) {
      const dist = r.left - dragRect.right;
      if (dist <= DISTANCE_MAX_RANGE && (!bestRight || dist < bestRight.dist)) {
        bestRight = { rect: r, dist };
      }
    }

    if (hOverlap && r.bottom <= dragRect.top) {
      const dist = dragRect.top - r.bottom;
      if (dist <= DISTANCE_MAX_RANGE && (!bestUp || dist < bestUp.dist)) {
        bestUp = { rect: r, dist };
      }
    }

    if (hOverlap && r.top >= dragRect.bottom) {
      const dist = r.top - dragRect.bottom;
      if (dist <= DISTANCE_MAX_RANGE && (!bestDown || dist < bestDown.dist)) {
        bestDown = { rect: r, dist };
      }
    }
  }

  if (bestLeft) {
    labels.push({
      axis: 'x', from: bestLeft.rect.right, to: dragRect.left,
      crossPos: overlapMidpoint(dragRect.top, dragRect.bottom, bestLeft.rect.top, bestLeft.rect.bottom),
      distance: bestLeft.dist,
    });
  }

  if (bestRight) {
    labels.push({
      axis: 'x', from: dragRect.right, to: bestRight.rect.left,
      crossPos: overlapMidpoint(dragRect.top, dragRect.bottom, bestRight.rect.top, bestRight.rect.bottom),
      distance: bestRight.dist,
    });
  }

  if (bestUp) {
    labels.push({
      axis: 'y', from: bestUp.rect.bottom, to: dragRect.top,
      crossPos: overlapMidpoint(dragRect.left, dragRect.right, bestUp.rect.left, bestUp.rect.right),
      distance: bestUp.dist,
    });
  }

  if (bestDown) {
    labels.push({
      axis: 'y', from: dragRect.bottom, to: bestDown.rect.top,
      crossPos: overlapMidpoint(dragRect.left, dragRect.right, bestDown.rect.left, bestDown.rect.right),
      distance: bestDown.dist,
    });
  }

  return labels;
}

export function computeDirectDistance(
  rectA: ElementRect,
  rectB: ElementRect,
): DistanceLabel[] {
  const labels: DistanceLabel[] = [];

  const vOverlap = rectA.bottom > rectB.top && rectA.top < rectB.bottom;
  const hOverlap = rectA.right > rectB.left && rectA.left < rectB.right;

  // Left: B is to the left of A
  if (vOverlap && rectB.right <= rectA.left) {
    const dist = rectA.left - rectB.right;
    if (dist > 0) {
      labels.push({
        axis: 'x', from: rectB.right, to: rectA.left,
        crossPos: overlapMidpoint(rectA.top, rectA.bottom, rectB.top, rectB.bottom),
        distance: dist,
      });
    }
  }

  // Right: B is to the right of A
  if (vOverlap && rectB.left >= rectA.right) {
    const dist = rectB.left - rectA.right;
    if (dist > 0) {
      labels.push({
        axis: 'x', from: rectA.right, to: rectB.left,
        crossPos: overlapMidpoint(rectA.top, rectA.bottom, rectB.top, rectB.bottom),
        distance: dist,
      });
    }
  }

  // Up: B is above A
  if (hOverlap && rectB.bottom <= rectA.top) {
    const dist = rectA.top - rectB.bottom;
    if (dist > 0) {
      labels.push({
        axis: 'y', from: rectB.bottom, to: rectA.top,
        crossPos: overlapMidpoint(rectA.left, rectA.right, rectB.left, rectB.right),
        distance: dist,
      });
    }
  }

  // Down: B is below A
  if (hOverlap && rectB.top >= rectA.bottom) {
    const dist = rectB.top - rectA.bottom;
    if (dist > 0) {
      labels.push({
        axis: 'y', from: rectA.bottom, to: rectB.top,
        crossPos: overlapMidpoint(rectA.left, rectA.right, rectB.left, rectB.right),
        distance: dist,
      });
    }
  }

  return labels;
}
