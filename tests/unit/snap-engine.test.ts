import { describe, it, expect } from 'vitest';
import { snapToGrid } from '../../src/content/modules/drag/snap-engine';
import type { GridReport } from '../../src/shared/types';

function makeGrid(overrides: Partial<GridReport> = {}): GridReport {
  return {
    containerMaxWidth: 1200,
    columns: 12,
    columnWidth: 75,
    gutterWidth: 24,
    marginLeft: 120,
    marginRight: 120,
    baselineHeight: 24,
    ...overrides,
  };
}

describe('snapToGrid', () => {
  describe('column snapping (X axis)', () => {
    it('snaps left edge to column left boundary within threshold', () => {
      const grid = makeGrid();
      // First column starts at marginLeft=120
      const result = snapToGrid(123, 100, 100, 50, grid);
      expect(result.snappedX).toBe(true);
      expect(result.left).toBe(120);
      expect(result.guideX).toBe(120);
    });

    it('snaps right edge to column right boundary within threshold', () => {
      const grid = makeGrid();
      // First column right edge = 120 + 75 = 195
      // Element right edge = left + width = 90 + 100 = 190
      // Distance to 195 = 5 (within threshold 8)
      const result = snapToGrid(90, 100, 100, 50, grid);
      expect(result.snappedX).toBe(true);
      // When snapping by right edge: snapped right = 195, so left = 195 - 100 = 95
      expect(result.left).toBe(95);
    });

    it('does not snap when outside threshold', () => {
      const grid = makeGrid();
      // Place element far from any column edge
      const result = snapToGrid(160, 100, 100, 50, grid);
      expect(result.snappedX).toBe(false);
      expect(result.left).toBe(160);
      expect(result.guideX).toBeNull();
    });

    it('prefers left edge snap when both edges are within threshold', () => {
      const grid = makeGrid();
      // Position exactly at column boundary
      const result = snapToGrid(120, 100, 75, 50, grid);
      expect(result.snappedX).toBe(true);
      expect(result.left).toBe(120);
    });
  });

  describe('baseline snapping (Y axis)', () => {
    it('snaps to nearest baseline multiple', () => {
      const grid = makeGrid({ baselineHeight: 24 });
      // 50 is between 48 (2*24) and 72 (3*24). Closest = 48. Dist = 2 < 8.
      const result = snapToGrid(120, 50, 100, 50, grid);
      expect(result.snappedY).toBe(true);
      expect(result.top).toBe(48);
    });

    it('does not snap Y when baseline is null', () => {
      const grid = makeGrid({ baselineHeight: null });
      const result = snapToGrid(120, 50, 100, 50, grid);
      expect(result.snappedY).toBe(false);
      expect(result.top).toBe(50);
      expect(result.guideY).toBeNull();
    });

    it('does not snap Y when outside threshold', () => {
      const grid = makeGrid({ baselineHeight: 100 });
      // top=55, bottom=55+30=85. Nearest to 55 = 100 (dist=45). Nearest to 85 = 100 (dist=15). Both > 8.
      const result = snapToGrid(120, 55, 100, 30, grid);
      expect(result.snappedY).toBe(false);
      expect(result.top).toBe(55);
    });
  });

  describe('edge cases', () => {
    it('handles 1 column grid', () => {
      const grid = makeGrid({ columns: 1, columnWidth: 960 });
      const result = snapToGrid(122, 100, 200, 50, grid);
      expect(result.snappedX).toBe(true);
      expect(result.left).toBe(120);
    });

    it('handles 0 columns gracefully (clamped to 1)', () => {
      const grid = makeGrid({ columns: 0, columnWidth: 0 });
      // Should not throw or produce NaN
      const result = snapToGrid(120, 100, 100, 50, grid);
      expect(Number.isNaN(result.left)).toBe(false);
      expect(Number.isNaN(result.top)).toBe(false);
    });

    it('handles zero baseline height', () => {
      const grid = makeGrid({ baselineHeight: 0 });
      const result = snapToGrid(120, 50, 100, 50, grid);
      // 0 baseline means no snapping
      expect(result.snappedY).toBe(false);
    });

    it('handles negative position values', () => {
      const grid = makeGrid();
      const result = snapToGrid(-10, -10, 100, 50, grid);
      expect(Number.isNaN(result.left)).toBe(false);
      expect(Number.isNaN(result.top)).toBe(false);
    });

    it('returns correct SnapResult shape', () => {
      const grid = makeGrid();
      const result = snapToGrid(120, 48, 100, 50, grid);
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('top');
      expect(result).toHaveProperty('snappedX');
      expect(result).toHaveProperty('snappedY');
      expect(result).toHaveProperty('guideX');
      expect(result).toHaveProperty('guideY');
    });
  });

  describe('threshold boundary', () => {
    it('snaps at exactly threshold distance (8px)', () => {
      const grid = makeGrid();
      // Column at 120. Element at 128 → dist = 8 = threshold
      const result = snapToGrid(128, 100, 100, 50, grid);
      expect(result.snappedX).toBe(true);
      expect(result.left).toBe(120);
    });

    it('does not snap just beyond threshold (9px)', () => {
      const grid = makeGrid();
      // Column at 120. Element at 129 → dist = 9 > threshold
      // But there might be another edge nearby. Check manually.
      // Next column left edge = 120 + 75 + 24 = 219. Dist from 129 = 90. No snap.
      const result = snapToGrid(129, 100, 50, 50, grid);
      // right edge = 179. Dist from 195 = 16 > 8. No snap from right either.
      expect(result.snappedX).toBe(false);
    });
  });

  describe('magnetic snap support fields', () => {
    it('returns nearestDistX and snapTargetLeft even when not snapped', () => {
      const grid = makeGrid();
      // Element at 160, not within snap threshold
      // Left edge=160, nearest column edge: 195 (right of col 0), dist=35
      // Right edge=260, nearest: 219 (left of col 1), dist=41
      // Or right edge nearest: 195 dist=65... let's check
      // Actually left=160, right=260. Nearest to 160: 195(dist=35) vs 120(dist=40) → 195(35)
      // Nearest to 260: 219+75=294(dist=34) vs ... closest is probably 294-24=270... let me just test the shape
      const result = snapToGrid(160, 100, 100, 50, grid);
      expect(result.snappedX).toBe(false);
      expect(result.nearestDistX).toBeGreaterThan(0);
      expect(result.nearestDistX).toBeLessThan(Infinity);
      expect(result.snapTargetLeft).toBeDefined();
      expect(typeof result.snapTargetLeft).toBe('number');
      expect(result.nearestGuideX).not.toBeNull();
    });

    it('returns nearestDistX = 0 when exactly on a snap line', () => {
      const grid = makeGrid();
      // Left edge exactly at column boundary 120
      const result = snapToGrid(120, 100, 75, 50, grid);
      expect(result.nearestDistX).toBe(0);
      expect(result.snapTargetLeft).toBe(120);
      expect(result.nearestGuideX).toBe(120);
    });

    it('returns nearestDistY and snapTargetTop with baseline', () => {
      const grid = makeGrid({ baselineHeight: 24 });
      // top=50, nearest baseline=48 (2*24), dist=2
      const result = snapToGrid(120, 50, 100, 50, grid);
      expect(result.nearestDistY).toBe(2);
      expect(result.snapTargetTop).toBe(48);
      expect(result.nearestGuideY).toBe(48);
    });

    it('returns Infinity nearestDistY when no baseline', () => {
      const grid = makeGrid({ baselineHeight: null });
      const result = snapToGrid(120, 50, 100, 50, grid);
      expect(result.nearestDistY).toBe(Infinity);
      expect(result.nearestGuideY).toBeNull();
    });

    it('snapTargetLeft accounts for right-edge snap', () => {
      const grid = makeGrid();
      // Element at left=90, width=100. Right edge=190.
      // Nearest to right edge: 195 (col 0 right), dist=5
      // Nearest to left edge: 120 (col 0 left), dist=30
      // Right edge is closer → snapTargetLeft = 195 - 100 = 95
      const result = snapToGrid(90, 100, 100, 50, grid);
      expect(result.snapTargetLeft).toBe(95);
      expect(result.nearestGuideX).toBe(195);
    });
  });
});
