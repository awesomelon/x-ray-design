import type { GridReport } from '@shared/types';

const SNAP_THRESHOLD = 8;

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

interface AxisSnapResult {
  value: number;
  snapped: boolean;
  fromA: boolean;
  guideLine: number | null;
  nearestDist: number;
  nearestLine: number | null;
  nearestFromA: boolean;
}

function computeColumnEdges(grid: GridReport): number[] {
  const cols = Math.max(1, grid.columns);
  const edges: number[] = [];
  for (let i = 0; i < cols; i++) {
    const colLeft = grid.marginLeft + i * (grid.columnWidth + grid.gutterWidth);
    edges.push(colLeft);
    edges.push(colLeft + grid.columnWidth);
  }
  return edges;
}

function findNearest(value: number, lines: number[]): { nearest: number; dist: number } {
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

function snapAxisToLines(
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

function snapAxisToBaseline(
  edgeA: number,
  edgeB: number,
  baselineHeight: number,
  threshold: number,
): AxisSnapResult {
  const nearestA = Math.round(edgeA / baselineHeight) * baselineHeight;
  const nearestB = Math.round(edgeB / baselineHeight) * baselineHeight;
  const distA = Math.abs(edgeA - nearestA);
  const distB = Math.abs(edgeB - nearestB);

  const nearest = distA <= distB
    ? { dist: distA, line: nearestA, fromA: true }
    : { dist: distB, line: nearestB, fromA: false };

  if (distA <= threshold && distA <= distB) {
    return {
      value: nearestA, snapped: true, fromA: true, guideLine: nearestA,
      nearestDist: nearest.dist, nearestLine: nearest.line, nearestFromA: nearest.fromA,
    };
  }
  if (distB <= threshold) {
    return {
      value: nearestB, snapped: true, fromA: false, guideLine: nearestB,
      nearestDist: nearest.dist, nearestLine: nearest.line, nearestFromA: nearest.fromA,
    };
  }
  return {
    value: edgeA, snapped: false, fromA: true, guideLine: null,
    nearestDist: nearest.dist, nearestLine: nearest.line, nearestFromA: nearest.fromA,
  };
}

export function snapToGrid(
  left: number,
  top: number,
  width: number,
  height: number,
  grid: GridReport,
): SnapResult {
  const xLines = computeColumnEdges(grid);
  const xSnap = snapAxisToLines(left, left + width, xLines, SNAP_THRESHOLD);

  let ySnap: AxisSnapResult;
  if (grid.baselineHeight && grid.baselineHeight > 0) {
    ySnap = snapAxisToBaseline(top, top + height, grid.baselineHeight, SNAP_THRESHOLD);
  } else {
    ySnap = {
      value: top, snapped: false, fromA: true, guideLine: null,
      nearestDist: Infinity, nearestLine: null, nearestFromA: true,
    };
  }

  const snapTargetLeft = xSnap.nearestLine !== null
    ? (xSnap.nearestFromA ? xSnap.nearestLine : xSnap.nearestLine - width)
    : left;
  const snapTargetTop = ySnap.nearestLine !== null
    ? (ySnap.nearestFromA ? ySnap.nearestLine : ySnap.nearestLine - height)
    : top;

  return {
    left: xSnap.fromA ? xSnap.value : xSnap.value - width,
    top: ySnap.fromA ? ySnap.value : ySnap.value - height,
    snappedX: xSnap.snapped,
    snappedY: ySnap.snapped,
    guideX: xSnap.guideLine,
    guideY: ySnap.guideLine,
    snapTargetLeft,
    snapTargetTop,
    nearestDistX: xSnap.nearestDist,
    nearestDistY: ySnap.nearestDist,
    nearestGuideX: xSnap.nearestLine,
    nearestGuideY: ySnap.nearestLine,
  };
}
