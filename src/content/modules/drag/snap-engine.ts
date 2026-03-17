import type { GridReport } from '@shared/types';

const SNAP_THRESHOLD = 8;

export interface SnapResult {
  left: number;
  top: number;
  snappedX: boolean;
  snappedY: boolean;
  guideX: number | null;
  guideY: number | null;
}

function computeColumnEdges(grid: GridReport): number[] {
  const edges: number[] = [];
  for (let i = 0; i < grid.columns; i++) {
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
): { value: number; snapped: boolean; fromA: boolean; guideLine: number | null } {
  if (lines.length === 0) return { value: edgeA, snapped: false, fromA: true, guideLine: null };

  const snapA = findNearest(edgeA, lines);
  const snapB = findNearest(edgeB, lines);

  if (snapA.dist <= threshold && snapA.dist <= snapB.dist) {
    return { value: snapA.nearest, snapped: true, fromA: true, guideLine: snapA.nearest };
  }
  if (snapB.dist <= threshold) {
    return { value: snapB.nearest, snapped: true, fromA: false, guideLine: snapB.nearest };
  }
  return { value: edgeA, snapped: false, fromA: true, guideLine: null };
}

function snapAxisToBaseline(
  edgeA: number,
  edgeB: number,
  baselineHeight: number,
  threshold: number,
): { value: number; snapped: boolean; fromA: boolean; guideLine: number | null } {
  const nearestA = Math.round(edgeA / baselineHeight) * baselineHeight;
  const nearestB = Math.round(edgeB / baselineHeight) * baselineHeight;
  const distA = Math.abs(edgeA - nearestA);
  const distB = Math.abs(edgeB - nearestB);

  if (distA <= threshold && distA <= distB) {
    return { value: nearestA, snapped: true, fromA: true, guideLine: nearestA };
  }
  if (distB <= threshold) {
    return { value: nearestB, snapped: true, fromA: false, guideLine: nearestB };
  }
  return { value: edgeA, snapped: false, fromA: true, guideLine: null };
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

  let ySnap: { value: number; snapped: boolean; fromA: boolean; guideLine: number | null };
  if (grid.baselineHeight && grid.baselineHeight > 0) {
    ySnap = snapAxisToBaseline(top, top + height, grid.baselineHeight, SNAP_THRESHOLD);
  } else {
    ySnap = { value: top, snapped: false, fromA: true, guideLine: null };
  }

  return {
    left: xSnap.fromA ? xSnap.value : xSnap.value - width,
    top: ySnap.fromA ? ySnap.value : ySnap.value - height,
    snappedX: xSnap.snapped,
    snappedY: ySnap.snapped,
    guideX: xSnap.guideLine,
    guideY: ySnap.guideLine,
  };
}
