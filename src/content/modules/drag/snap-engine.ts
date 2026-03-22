import type { ElementRect, SpacingGuide, DistanceLabel } from '@shared/types';

export const SNAP_THRESHOLD = 8;

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
let cachedScrollX = -1;
let cachedScrollY = -1;

/**
 * Hierarchical scan of visible elements relative to dragged elements.
 * DOM-dependent — cannot be unit-tested without a browser.
 */
export function scanVisibleElements(draggedEls: Set<HTMLElement>): ElementRect[] {
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

      // Collect sibling elements
      for (const child of Array.from(parent.children)) {
        if (seen.has(child)) continue;
        seen.add(child);
        const r = filterAndMakeRect(child as HTMLElement, vpW, vpH);
        if (r) rects.push(r);
      }

      // Parent itself as container boundary
      if (!seen.has(parent)) {
        seen.add(parent);
        const r = filterAndMakeRect(parent, vpW, vpH);
        if (r) rects.push(r);
      }

      // Grandparent level: uncle/aunt elements
      const grandparent = parent.parentElement;
      if (grandparent) {
        for (const uncle of Array.from(grandparent.children)) {
          if (seen.has(uncle) || uncle === parent) continue;
          seen.add(uncle);
          const r = filterAndMakeRect(uncle as HTMLElement, vpW, vpH);
          if (r) rects.push(r);
        }
      }
    }

    cachedRects = rects;
    return rects;
  } catch {
    return [];
  }
}

/**
 * Pure filtering logic extracted for potential testing.
 * Returns an ElementRect if the element passes size filters, null otherwise.
 */
export function filterAndMakeRect(
  el: HTMLElement,
  viewportWidth: number,
  viewportHeight: number,
): ElementRect | null {
  const r = el.getBoundingClientRect();
  // Skip tiny elements
  if (r.width < 5 || r.height < 5) return null;
  // Skip elements covering > 80% of viewport in both dimensions
  if (r.width > viewportWidth * 0.8 && r.height > viewportHeight * 0.8) return null;

  return {
    left: r.left,
    right: r.right,
    top: r.top,
    bottom: r.bottom,
    centerX: r.left + r.width / 2,
    centerY: r.top + r.height / 2,
    width: r.width,
    height: r.height,
  };
}

/**
 * Invalidate the scan cache (e.g., on scroll during non-drag).
 */
export function invalidateScanCache(): void {
  cachedRects = [];
  cachedScrollX = -1;
  cachedScrollY = -1;
}

/**
 * Extract snap lines from element rects.
 * For each rect: left, right, centerX -> xLines; top, bottom, centerY -> yLines.
 * Deduplicates lines within 0.5px of each other and sorts.
 */
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
  values.sort((a, b) => a - b);
  const result: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - result[result.length - 1]) > 0.5) {
      result.push(values[i]);
    }
  }
  return result;
}

/**
 * Snap a dragged element to nearby element edges and centers.
 * Returns a SnapResult compatible with the existing magnetic snap system.
 */
export function snapToElements(
  left: number,
  top: number,
  width: number,
  height: number,
  rects: ElementRect[],
): SnapResult {
  const { xLines, yLines } = collectSnapLines(rects);

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

/**
 * Detect equal spacing between the dragged element and its neighbors.
 * Returns SpacingGuide entries when gaps match (within 1px tolerance).
 */
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

/**
 * Compute distance labels from the dragged element to its nearest neighbors in 4 directions.
 * Returns up to 4 labels (left, right, up, down) for elements within 200px.
 */
export function computeDistances(
  dragRect: ElementRect,
  otherRects: ElementRect[],
): DistanceLabel[] {
  const MAX_RANGE = 200;
  const labels: DistanceLabel[] = [];

  // LEFT: elements whose right edge is to the left of dragRect's left edge,
  // and vertically overlapping
  let bestLeft: { rect: ElementRect; dist: number } | null = null;
  let bestRight: { rect: ElementRect; dist: number } | null = null;
  let bestUp: { rect: ElementRect; dist: number } | null = null;
  let bestDown: { rect: ElementRect; dist: number } | null = null;

  for (const r of otherRects) {
    const vOverlap = r.bottom > dragRect.top && r.top < dragRect.bottom;
    const hOverlap = r.right > dragRect.left && r.left < dragRect.right;

    // Left neighbor
    if (vOverlap && r.right <= dragRect.left) {
      const dist = dragRect.left - r.right;
      if (dist <= MAX_RANGE && (!bestLeft || dist < bestLeft.dist)) {
        bestLeft = { rect: r, dist };
      }
    }

    // Right neighbor
    if (vOverlap && r.left >= dragRect.right) {
      const dist = r.left - dragRect.right;
      if (dist <= MAX_RANGE && (!bestRight || dist < bestRight.dist)) {
        bestRight = { rect: r, dist };
      }
    }

    // Up neighbor
    if (hOverlap && r.bottom <= dragRect.top) {
      const dist = dragRect.top - r.bottom;
      if (dist <= MAX_RANGE && (!bestUp || dist < bestUp.dist)) {
        bestUp = { rect: r, dist };
      }
    }

    // Down neighbor
    if (hOverlap && r.top >= dragRect.bottom) {
      const dist = r.top - dragRect.bottom;
      if (dist <= MAX_RANGE && (!bestDown || dist < bestDown.dist)) {
        bestDown = { rect: r, dist };
      }
    }
  }

  if (bestLeft) {
    const crossPos = Math.max(dragRect.top, bestLeft.rect.top) +
      (Math.min(dragRect.bottom, bestLeft.rect.bottom) - Math.max(dragRect.top, bestLeft.rect.top)) / 2;
    labels.push({
      axis: 'x',
      from: bestLeft.rect.right,
      to: dragRect.left,
      crossPos,
      distance: bestLeft.dist,
    });
  }

  if (bestRight) {
    const crossPos = Math.max(dragRect.top, bestRight.rect.top) +
      (Math.min(dragRect.bottom, bestRight.rect.bottom) - Math.max(dragRect.top, bestRight.rect.top)) / 2;
    labels.push({
      axis: 'x',
      from: dragRect.right,
      to: bestRight.rect.left,
      crossPos,
      distance: bestRight.dist,
    });
  }

  if (bestUp) {
    const crossPos = Math.max(dragRect.left, bestUp.rect.left) +
      (Math.min(dragRect.right, bestUp.rect.right) - Math.max(dragRect.left, bestUp.rect.left)) / 2;
    labels.push({
      axis: 'y',
      from: bestUp.rect.bottom,
      to: dragRect.top,
      crossPos,
      distance: bestUp.dist,
    });
  }

  if (bestDown) {
    const crossPos = Math.max(dragRect.left, bestDown.rect.left) +
      (Math.min(dragRect.right, bestDown.rect.right) - Math.max(dragRect.left, bestDown.rect.left)) / 2;
    labels.push({
      axis: 'y',
      from: dragRect.bottom,
      to: bestDown.rect.top,
      crossPos,
      distance: bestDown.dist,
    });
  }

  return labels;
}
