import { describe, it, expect } from 'vitest';
import {
  snapToElements,
  collectSnapLines,
  detectEqualSpacing,
  computeDistances,
  findNearest,
  snapAxisToLines,
  SNAP_THRESHOLD,
} from '../../src/content/modules/drag/snap-engine';
import type { ElementRect } from '../../src/shared/types';

function makeRect(left: number, top: number, width: number, height: number): ElementRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

// ---------------------------------------------------------------------------
// collectSnapLines
// ---------------------------------------------------------------------------

describe('collectSnapLines', () => {
  it('extracts edges and centers from rects', () => {
    const rects = [makeRect(100, 200, 50, 30)];
    const { xLines, yLines } = collectSnapLines(rects);

    expect(xLines).toContain(100);   // left
    expect(xLines).toContain(150);   // right
    expect(xLines).toContain(125);   // centerX

    expect(yLines).toContain(200);   // top
    expect(yLines).toContain(230);   // bottom
    expect(yLines).toContain(215);   // centerY
  });

  it('deduplicates lines within 0.5px', () => {
    const rects = [
      makeRect(100, 200, 50, 30),
      makeRect(100.3, 300, 60, 40), // left = 100.3 is within 0.5px of 100
    ];
    const { xLines } = collectSnapLines(rects);

    // 100 and 100.3 should be deduplicated to a single entry
    const near100 = xLines.filter(v => Math.abs(v - 100) <= 0.5);
    expect(near100).toHaveLength(1);
  });

  it('returns sorted arrays', () => {
    const rects = [
      makeRect(300, 100, 50, 30),
      makeRect(100, 200, 50, 30),
    ];
    const { xLines, yLines } = collectSnapLines(rects);

    for (let i = 1; i < xLines.length; i++) {
      expect(xLines[i]).toBeGreaterThanOrEqual(xLines[i - 1]);
    }
    for (let i = 1; i < yLines.length; i++) {
      expect(yLines[i]).toBeGreaterThanOrEqual(yLines[i - 1]);
    }
  });

  it('returns empty arrays for empty input', () => {
    const { xLines, yLines } = collectSnapLines([]);
    expect(xLines).toEqual([]);
    expect(yLines).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findNearest & snapAxisToLines (preserved functions)
// ---------------------------------------------------------------------------

describe('findNearest', () => {
  it('finds the nearest line', () => {
    const result = findNearest(105, [100, 200, 300]);
    expect(result.nearest).toBe(100);
    expect(result.dist).toBe(5);
  });

  it('finds exact match', () => {
    const result = findNearest(200, [100, 200, 300]);
    expect(result.nearest).toBe(200);
    expect(result.dist).toBe(0);
  });
});

describe('snapAxisToLines', () => {
  it('snaps edgeA within threshold', () => {
    const result = snapAxisToLines(103, 203, [100, 200], SNAP_THRESHOLD);
    expect(result.snapped).toBe(true);
    expect(result.value).toBe(100);
    expect(result.fromA).toBe(true);
  });

  it('snaps edgeB within threshold', () => {
    const result = snapAxisToLines(95, 195, [200], SNAP_THRESHOLD);
    expect(result.snapped).toBe(true);
    expect(result.value).toBe(200);
    expect(result.fromA).toBe(false);
  });

  it('does not snap when outside threshold', () => {
    const result = snapAxisToLines(50, 150, [100], SNAP_THRESHOLD);
    // edgeA dist = 50, edgeB dist = 50, both > 8
    expect(result.snapped).toBe(false);
  });

  it('returns no snap for empty lines', () => {
    const result = snapAxisToLines(100, 200, [], SNAP_THRESHOLD);
    expect(result.snapped).toBe(false);
    expect(result.nearestDist).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// snapToElements
// ---------------------------------------------------------------------------

describe('snapToElements', () => {
  it('snaps left edge to a reference element left edge', () => {
    const refs = [makeRect(100, 0, 50, 200)];
    // Dragged element at left=103 → should snap to 100
    const result = snapToElements(103, 50, 80, 40, refs);
    expect(result.snappedX).toBe(true);
    expect(result.left).toBe(100);
    expect(result.guideX).toBe(100);
  });

  it('snaps right edge to a reference element right edge', () => {
    const refs = [makeRect(100, 0, 50, 200)]; // right=150
    // Dragged element: left=97, width=50, right=147 → dist to 150 = 3
    const result = snapToElements(97, 50, 50, 40, refs);
    expect(result.snappedX).toBe(true);
    // snapped right = 150, so left = 150 - 50 = 100
    expect(result.left).toBe(100);
  });

  it('snaps top edge to a reference element top edge', () => {
    const refs = [makeRect(0, 200, 300, 100)];
    // Dragged element at top=203 → should snap to 200
    const result = snapToElements(50, 203, 80, 40, refs);
    expect(result.snappedY).toBe(true);
    expect(result.top).toBe(200);
  });

  it('snaps center to a reference element center', () => {
    const refs = [makeRect(100, 100, 200, 200)]; // centerX=200, centerY=200
    // Dragged element: width=80, so centerX at left + 40.
    // If centerX should be 200, left should be 160.
    // Position at left=162 → centerX=202, dist=2 from 200.
    // Edge snaps: left=162 dist from 100=62 (no), right=242 dist from 300=58 (no).
    // Center snap (dist=2) is closer than edge snap (dist=58), so center wins.
    const result = snapToElements(162, 162, 80, 80, refs);
    expect(result.snappedX).toBe(true);
    expect(result.left).toBe(160); // centerX snaps to 200, so left = 200 - 40 = 160
    expect(result.snappedY).toBe(true);
    expect(result.top).toBe(160);
  });

  it('does not snap when far from any element', () => {
    const refs = [makeRect(100, 100, 50, 50)];
    // Dragged element far away: left=500, top=500
    const result = snapToElements(500, 500, 80, 40, refs);
    expect(result.snappedX).toBe(false);
    expect(result.snappedY).toBe(false);
    expect(result.left).toBe(500);
    expect(result.top).toBe(500);
  });

  it('handles cross-edge snapping (left edge snaps to right edge of reference)', () => {
    const refs = [makeRect(100, 0, 50, 200)]; // right=150
    // Dragged element at left=153 → dist to 150 = 3 (snap left to ref right)
    const result = snapToElements(153, 50, 80, 40, refs);
    expect(result.snappedX).toBe(true);
    expect(result.left).toBe(150);
  });

  it('snaps at exactly threshold distance', () => {
    const refs = [makeRect(100, 100, 50, 50)]; // left=100
    // Dragged element at left=108 → dist = 8 = threshold
    const result = snapToElements(108, 100, 50, 50, refs);
    expect(result.snappedX).toBe(true);
    expect(result.left).toBe(100);
  });

  it('does not snap just beyond threshold', () => {
    // Create a rect where no edge/center is within 8px
    const refs = [makeRect(100, 100, 50, 50)]; // left=100, right=150, center=125
    // Dragged element: left=60, width=30, right=90, center=75
    // dist(left=60, nearest=100)=40, dist(right=90, nearest=100)=10, dist(center=75, nearest=100)=25
    // right dist = 10 > 8, no snap
    const result = snapToElements(60, 200, 30, 30, refs);
    expect(result.snappedX).toBe(false);
  });

  it('returns correct SnapResult shape', () => {
    const refs = [makeRect(100, 100, 50, 50)];
    const result = snapToElements(103, 103, 50, 50, refs);
    expect(result).toHaveProperty('left');
    expect(result).toHaveProperty('top');
    expect(result).toHaveProperty('snappedX');
    expect(result).toHaveProperty('snappedY');
    expect(result).toHaveProperty('guideX');
    expect(result).toHaveProperty('guideY');
    expect(result).toHaveProperty('snapTargetLeft');
    expect(result).toHaveProperty('snapTargetTop');
    expect(result).toHaveProperty('nearestDistX');
    expect(result).toHaveProperty('nearestDistY');
    expect(result).toHaveProperty('nearestGuideX');
    expect(result).toHaveProperty('nearestGuideY');
  });

  it('handles empty rects array gracefully', () => {
    const result = snapToElements(100, 100, 50, 50, []);
    expect(result.snappedX).toBe(false);
    expect(result.snappedY).toBe(false);
    expect(result.left).toBe(100);
    expect(result.top).toBe(100);
    expect(result.nearestDistX).toBe(Infinity);
    expect(result.nearestDistY).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// detectEqualSpacing
// ---------------------------------------------------------------------------

describe('detectEqualSpacing', () => {
  it('detects equal horizontal spacing between 3 elements', () => {
    // Three elements spaced 20px apart on X axis:
    // A: [0, 50], gap=20, B(drag): [70, 120], gap=20, C: [140, 190]
    const a = makeRect(0, 100, 50, 50);
    const c = makeRect(140, 100, 50, 50);
    const drag = makeRect(70, 100, 50, 50);

    const guides = detectEqualSpacing(drag, [a, c], 'x');
    expect(guides.length).toBeGreaterThan(0);

    // All detected gaps should be ~20
    for (const g of guides) {
      expect(g.axis).toBe('x');
      expect(Math.abs(g.gap - 20)).toBeLessThanOrEqual(1);
    }
  });

  it('detects equal vertical spacing between 3 elements', () => {
    const a = makeRect(100, 0, 50, 50);
    const c = makeRect(100, 140, 50, 50);
    const drag = makeRect(100, 70, 50, 50);

    const guides = detectEqualSpacing(drag, [a, c], 'y');
    expect(guides.length).toBeGreaterThan(0);

    for (const g of guides) {
      expect(g.axis).toBe('y');
      expect(Math.abs(g.gap - 20)).toBeLessThanOrEqual(1);
    }
  });

  it('does not detect spacing when gaps are unequal', () => {
    // A: [0, 50], gap=20, drag: [70, 120], gap=50, C: [170, 220]
    const a = makeRect(0, 100, 50, 50);
    const c = makeRect(170, 100, 50, 50);
    const drag = makeRect(70, 100, 50, 50);

    const guides = detectEqualSpacing(drag, [a, c], 'x');

    // gap before = 20, gap after = 50, gap between a and c = 120
    // None of these match each other within 1px, so no guides should be returned
    // Actually: gapBefore=20, gapAfter=50, pairGap between a and c = 170 - 50 = 120
    // 20 != 120, 50 != 120, 20 != 50 → no guides
    expect(guides).toHaveLength(0);
  });

  it('returns empty when fewer than 2 reference elements', () => {
    const drag = makeRect(70, 100, 50, 50);
    const single = makeRect(0, 100, 50, 50);
    expect(detectEqualSpacing(drag, [single], 'x')).toHaveLength(0);
    expect(detectEqualSpacing(drag, [], 'x')).toHaveLength(0);
  });

  it('detects matching gaps between drag-neighbor and other-pair', () => {
    // Existing pair with gap = 30:
    // P: [0, 50], gap=30, Q: [80, 130]
    // drag: [160, 210], gap from Q to drag = 160-130=30 → matches pair gap!
    const p = makeRect(0, 100, 50, 50);
    const q = makeRect(80, 100, 50, 50);
    const drag = makeRect(160, 100, 50, 50);

    const guides = detectEqualSpacing(drag, [p, q], 'x');
    expect(guides.length).toBeGreaterThan(0);
    // The gap between drag and Q should match the pair gap
    const matchingGuide = guides.find(g => Math.abs(g.gap - 30) <= 1);
    expect(matchingGuide).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// computeDistances
// ---------------------------------------------------------------------------

describe('computeDistances', () => {
  it('computes distances in all 4 directions', () => {
    const drag = makeRect(200, 200, 50, 50);
    const leftEl = makeRect(100, 200, 50, 50);   // right=150, gap=50
    const rightEl = makeRect(300, 200, 50, 50);  // left=300, gap=50
    const topEl = makeRect(200, 100, 50, 50);    // bottom=150, gap=50
    const bottomEl = makeRect(200, 300, 50, 50); // top=300, gap=50

    const labels = computeDistances(drag, [leftEl, rightEl, topEl, bottomEl]);
    expect(labels).toHaveLength(4);

    const xLabels = labels.filter(l => l.axis === 'x');
    const yLabels = labels.filter(l => l.axis === 'y');
    expect(xLabels).toHaveLength(2);
    expect(yLabels).toHaveLength(2);

    for (const label of labels) {
      expect(label.distance).toBe(50);
    }
  });

  it('returns only available directions', () => {
    const drag = makeRect(200, 200, 50, 50);
    // Only one neighbor to the right
    const rightEl = makeRect(300, 200, 50, 50);
    const labels = computeDistances(drag, [rightEl]);
    expect(labels).toHaveLength(1);
    expect(labels[0].axis).toBe('x');
    expect(labels[0].distance).toBe(50);
    expect(labels[0].from).toBe(250);  // drag right
    expect(labels[0].to).toBe(300);    // rightEl left
  });

  it('ignores overlapping elements', () => {
    const drag = makeRect(200, 200, 50, 50);
    // Overlapping element (shares horizontal space with drag)
    const overlapping = makeRect(210, 210, 30, 30);
    const labels = computeDistances(drag, [overlapping]);
    // Overlapping element is not to the left, right, above, or below
    expect(labels).toHaveLength(0);
  });

  it('ignores elements beyond 200px range', () => {
    const drag = makeRect(200, 200, 50, 50);
    // drag right = 250, farRight left = 450, gap = 200 (exactly at limit)
    const farRight = makeRect(450, 200, 50, 50);
    const labels = computeDistances(drag, [farRight]);
    // Distance exactly 200 should be included (<=200)
    expect(labels).toHaveLength(1);

    // drag right = 250, tooFar left = 451, gap = 201 > 200
    const tooFar = makeRect(451, 200, 50, 50);
    const labels2 = computeDistances(drag, [tooFar]);
    expect(labels2).toHaveLength(0);
  });

  it('picks the nearest element per direction', () => {
    const drag = makeRect(200, 200, 50, 50);
    const close = makeRect(260, 200, 50, 50); // gap = 10
    const far = makeRect(300, 200, 50, 50);   // gap = 50
    const labels = computeDistances(drag, [close, far]);
    const xLabels = labels.filter(l => l.axis === 'x');
    expect(xLabels).toHaveLength(1);
    expect(xLabels[0].distance).toBe(10);
  });

  it('computes correct crossPos for label placement', () => {
    const drag = makeRect(200, 200, 50, 50); // top=200, bottom=250
    const rightEl = makeRect(300, 210, 50, 30); // top=210, bottom=240
    const labels = computeDistances(drag, [rightEl]);
    expect(labels).toHaveLength(1);
    // Vertical overlap: max(200,210)=210, min(250,240)=240
    // crossPos = 210 + (240-210)/2 = 225
    expect(labels[0].crossPos).toBe(225);
  });

  it('requires vertical overlap for horizontal distances', () => {
    const drag = makeRect(200, 200, 50, 50);
    // Element to the right but no vertical overlap
    const noOverlap = makeRect(300, 300, 50, 50);
    const labels = computeDistances(drag, [noOverlap]);
    expect(labels).toHaveLength(0);
  });

  it('returns empty for empty rects array', () => {
    const drag = makeRect(200, 200, 50, 50);
    const labels = computeDistances(drag, []);
    expect(labels).toHaveLength(0);
  });
});
