import type { GridReport } from '@shared/types';

const SNAP_THRESHOLD = 5;

export interface SnapResult {
  left: number;
  top: number;
  snappedX: boolean;
  snappedY: boolean;
}

/**
 * GridReport에서 컬럼의 좌우 경계 x 좌표를 계산한다.
 */
function computeColumnEdges(grid: GridReport): number[] {
  const edges: number[] = [];
  for (let i = 0; i < grid.columns; i++) {
    const colLeft = grid.marginLeft + i * (grid.columnWidth + grid.gutterWidth);
    edges.push(colLeft);
    edges.push(colLeft + grid.columnWidth);
  }
  return edges;
}

/**
 * 주어진 값에서 가장 가까운 라인을 찾는다.
 */
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

/**
 * 두 변(edgeA, edgeB) 중 라인 배열에 더 가까운 변을 스냅한다.
 */
function snapAxisToLines(
  edgeA: number,
  edgeB: number,
  lines: number[],
  threshold: number,
): { value: number; snapped: boolean; fromA: boolean } {
  if (lines.length === 0) return { value: edgeA, snapped: false, fromA: true };

  const snapA = findNearest(edgeA, lines);
  const snapB = findNearest(edgeB, lines);

  if (snapA.dist <= threshold && snapA.dist <= snapB.dist) {
    return { value: snapA.nearest, snapped: true, fromA: true };
  }
  if (snapB.dist <= threshold) {
    return { value: snapB.nearest, snapped: true, fromA: false };
  }
  return { value: edgeA, snapped: false, fromA: true };
}

/**
 * 두 변 중 베이스라인에 더 가까운 변을 스냅한다.
 */
function snapAxisToBaseline(
  edgeA: number,
  edgeB: number,
  baselineHeight: number,
  threshold: number,
): { value: number; snapped: boolean; fromA: boolean } {
  const nearestA = Math.round(edgeA / baselineHeight) * baselineHeight;
  const nearestB = Math.round(edgeB / baselineHeight) * baselineHeight;
  const distA = Math.abs(edgeA - nearestA);
  const distB = Math.abs(edgeB - nearestB);

  if (distA <= threshold && distA <= distB) {
    return { value: nearestA, snapped: true, fromA: true };
  }
  if (distB <= threshold) {
    return { value: nearestB, snapped: true, fromA: false };
  }
  return { value: edgeA, snapped: false, fromA: true };
}

/**
 * X축은 컬럼 경계에, Y축은 베이스라인에 스냅한다.
 */
export function snapToGrid(
  left: number,
  top: number,
  width: number,
  height: number,
  grid: GridReport,
): SnapResult {
  const xLines = computeColumnEdges(grid);
  const xSnap = snapAxisToLines(left, left + width, xLines, SNAP_THRESHOLD);

  let ySnap: { value: number; snapped: boolean; fromA: boolean };
  if (grid.baselineHeight && grid.baselineHeight > 0) {
    ySnap = snapAxisToBaseline(top, top + height, grid.baselineHeight, SNAP_THRESHOLD);
  } else {
    ySnap = { value: top, snapped: false, fromA: true };
  }

  return {
    left: xSnap.fromA ? xSnap.value : xSnap.value - width,
    top: ySnap.fromA ? ySnap.value : ySnap.value - height,
    snappedX: xSnap.snapped,
    snappedY: ySnap.snapped,
  };
}
