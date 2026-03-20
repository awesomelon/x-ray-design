import { describe, it, expect } from 'vitest';
import {
  magneticInterpolate,
  MAGNETIC_ZONE,
  BREAKAWAY_ZONE,
  SNAP_LOCK,
} from '../../src/content/modules/drag/drag-core';

describe('magneticInterpolate', () => {
  const snapTarget = 120;

  describe('entering snap zone (wasSnapped = false)', () => {
    it('[A] FREE: returns raw position when outside magnetic zone', () => {
      const rawPos = 145; // dist = 25 > MAGNETIC_ZONE(20)
      const result = magneticInterpolate(rawPos, snapTarget, 25, false);
      expect(result.pos).toBe(rawPos);
      expect(result.isSnapped).toBe(false);
    });

    it('[B] LOCKED: returns snap target within dead zone', () => {
      const rawPos = 121; // dist = 1 ≤ SNAP_LOCK(2)
      const result = magneticInterpolate(rawPos, snapTarget, 1, false);
      expect(result.pos).toBe(snapTarget);
      expect(result.isSnapped).toBe(true);
    });

    it('[C] PULL: applies quadratic interpolation in magnetic zone', () => {
      const rawPos = 130; // dist = 10
      const result = magneticInterpolate(rawPos, snapTarget, 10, false);

      // t = 1 - (10/20)² = 1 - 0.25 = 0.75
      // pos = 130 + (120 - 130) * 0.75 = 130 - 7.5 = 122.5
      expect(result.pos).toBeCloseTo(122.5);
      expect(result.isSnapped).toBe(true);
    });

    it('[C] PULL: weak pull at zone boundary', () => {
      const rawPos = 139; // dist = 19
      const result = magneticInterpolate(rawPos, snapTarget, 19, false);

      // t = 1 - (19/20)² = 1 - 0.9025 = 0.0975
      // pos = 139 + (120 - 139) * 0.0975 = 139 - 1.8525 ≈ 137.15
      expect(result.pos).toBeCloseTo(137.1475);
      expect(result.isSnapped).toBe(true);
    });

    it('[C] PULL: strong pull close to snap point', () => {
      const rawPos = 125; // dist = 5
      const result = magneticInterpolate(rawPos, snapTarget, 5, false);

      // t = 1 - (5/20)² = 1 - 0.0625 = 0.9375
      // pos = 125 + (120 - 125) * 0.9375 = 125 - 4.6875 = 120.3125
      expect(result.pos).toBeCloseTo(120.3125);
      expect(result.isSnapped).toBe(true);
    });

    it('boundary: snap at exactly MAGNETIC_ZONE distance', () => {
      const rawPos = 140; // dist = 20 = MAGNETIC_ZONE
      const result = magneticInterpolate(rawPos, snapTarget, MAGNETIC_ZONE, false);

      // t = 1 - (20/20)² = 0 → pos = rawPos
      expect(result.pos).toBeCloseTo(rawPos);
      expect(result.isSnapped).toBe(true);
    });

    it('boundary: no snap just beyond MAGNETIC_ZONE', () => {
      const result = magneticInterpolate(141, snapTarget, MAGNETIC_ZONE + 1, false);
      expect(result.pos).toBe(141);
      expect(result.isSnapped).toBe(false);
    });
  });

  describe('leaving snap zone — hysteresis (wasSnapped = true)', () => {
    it('[D] ESCAPE: returns raw position when exceeding breakaway zone', () => {
      const rawPos = 150; // dist = 30 > BREAKAWAY_ZONE(26)
      const result = magneticInterpolate(rawPos, snapTarget, 30, true);
      expect(result.pos).toBe(rawPos);
      expect(result.isSnapped).toBe(false);
    });

    it('[E] LOCKED: remains at snap target in dead zone', () => {
      const rawPos = 121.5; // dist = 1.5 ≤ SNAP_LOCK(2)
      const result = magneticInterpolate(rawPos, snapTarget, 1.5, true);
      expect(result.pos).toBe(snapTarget);
      expect(result.isSnapped).toBe(true);
    });

    it('[F] RESIST: still snapped at distance > MAGNETIC_ZONE when wasSnapped', () => {
      // dist = 22 → exceeds MAGNETIC_ZONE(20) but within BREAKAWAY_ZONE(26)
      const rawPos = 142;
      const result = magneticInterpolate(rawPos, snapTarget, 22, true);

      // zone = BREAKAWAY_ZONE = 26
      // t = 1 - (22/26)² = 1 - 0.7160 ≈ 0.284
      // pos = 142 + (120 - 142) * 0.284 ≈ 142 - 6.248 ≈ 135.75
      expect(result.isSnapped).toBe(true);
      expect(result.pos).toBeGreaterThan(snapTarget);
      expect(result.pos).toBeLessThan(rawPos);
    });

    it('boundary: snap at exactly BREAKAWAY_ZONE distance', () => {
      const result = magneticInterpolate(146, snapTarget, BREAKAWAY_ZONE, true);
      // t = 1 - (26/26)² = 0 → pos ≈ rawPos
      expect(result.pos).toBeCloseTo(146);
      expect(result.isSnapped).toBe(true);
    });

    it('boundary: escapes just beyond BREAKAWAY_ZONE', () => {
      const result = magneticInterpolate(147, snapTarget, BREAKAWAY_ZONE + 1, true);
      expect(result.pos).toBe(147);
      expect(result.isSnapped).toBe(false);
    });

    it('hysteresis: snapped state persists past MAGNETIC_ZONE', () => {
      // At dist = 21, NOT snapped → FREE
      const entering = magneticInterpolate(141, snapTarget, 21, false);
      expect(entering.isSnapped).toBe(false);

      // At dist = 21, WAS snapped → RESIST (still pulled)
      const resisting = magneticInterpolate(141, snapTarget, 21, true);
      expect(resisting.isSnapped).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles zero distance', () => {
      const result = magneticInterpolate(120, 120, 0, false);
      expect(result.pos).toBe(120);
      expect(result.isSnapped).toBe(true);
    });

    it('works with negative snap direction (raw < target)', () => {
      // rawPos = 110, snapTarget = 120, dist = 10
      const result = magneticInterpolate(110, 120, 10, false);
      // t = 1 - (10/20)² = 0.75
      // pos = 110 + (120 - 110) * 0.75 = 110 + 7.5 = 117.5
      expect(result.pos).toBeCloseTo(117.5);
      expect(result.isSnapped).toBe(true);
    });
  });

  describe('adaptive magnetic zone (custom zone params)', () => {
    it('[D] uses default zone when gutter is large (≥33px)', () => {
      // gutter=40, adaptiveZone = min(20, 40*0.6=24) = 20 → same as default
      const result = magneticInterpolate(135, snapTarget, 15, false, 20, 26);
      const defaultResult = magneticInterpolate(135, snapTarget, 15, false);
      expect(result.pos).toBe(defaultResult.pos);
      expect(result.isSnapped).toBe(defaultResult.isSnapped);
    });

    it('[E] uses smaller zone for narrow gutter', () => {
      // gutter=8, adaptiveZone = min(20, 8*0.6=4.8) = 4.8
      const smallZone = 4.8;
      const smallBreakaway = smallZone * (26 / 20); // 6.24

      // At dist=5 with default zone (20): snapped
      const defaultResult = magneticInterpolate(125, snapTarget, 5, false);
      expect(defaultResult.isSnapped).toBe(true);

      // At dist=5 with small zone (4.8): NOT snapped (5 > 4.8)
      const adaptiveResult = magneticInterpolate(125, snapTarget, 5, false, smallZone, smallBreakaway);
      expect(adaptiveResult.isSnapped).toBe(false);
      expect(adaptiveResult.pos).toBe(125); // returns raw
    });

    it('[E] pulls within smaller zone', () => {
      const smallZone = 4.8;
      const smallBreakaway = smallZone * (26 / 20);

      // At dist=3 with small zone: snapped, quadratic pull
      // t = 1 - (3/4.8)² = 1 - 0.390625 = 0.609375
      const result = magneticInterpolate(123, snapTarget, 3, false, smallZone, smallBreakaway);
      expect(result.isSnapped).toBe(true);
      expect(result.pos).toBeGreaterThan(snapTarget);
      expect(result.pos).toBeLessThan(123);
    });

    it('[F] handles gutter=0 safely (zone clamped to 1)', () => {
      // gutter=0, adaptiveZone = min(20, max(1, 0)) = 1
      const result = magneticInterpolate(121, snapTarget, 0.5, false, 1, 1.3);
      expect(result.isSnapped).toBe(true);
      expect(Number.isFinite(result.pos)).toBe(true);
    });

    it('[G] custom zone preserves hysteresis behavior', () => {
      const zone = 10;
      const breakaway = 13;

      // Not snapped, dist=11 > zone(10): FREE
      const entering = magneticInterpolate(131, snapTarget, 11, false, zone, breakaway);
      expect(entering.isSnapped).toBe(false);

      // Was snapped, dist=11 < breakaway(13): RESIST
      const resisting = magneticInterpolate(131, snapTarget, 11, true, zone, breakaway);
      expect(resisting.isSnapped).toBe(true);
    });
  });
});
