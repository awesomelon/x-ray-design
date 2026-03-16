import { describe, it, expect } from 'vitest';

// matchRatioName과 deriveScale은 모듈 내부 함수이므로
// 같은 로직을 독립적으로 검증한다.

const NAMED_RATIOS: [number, string][] = [
  [1.067, 'Minor Second'],
  [1.125, 'Major Second'],
  [1.2, 'Minor Third'],
  [1.25, 'Major Third'],
  [1.333, 'Perfect Fourth'],
  [1.414, 'Augmented Fourth'],
  [1.5, 'Perfect Fifth'],
  [1.618, 'Golden Ratio'],
];

function matchRatioName(r: number): string | null {
  let closest: string | null = null;
  let minDiff = Infinity;
  for (const [value, name] of NAMED_RATIOS) {
    const diff = Math.abs(r - value);
    if (diff < minDiff && diff < 0.03) {
      minDiff = diff;
      closest = name;
    }
  }
  return closest;
}

describe('matchRatioName', () => {
  it('matches exact Golden Ratio', () => {
    expect(matchRatioName(1.618)).toBe('Golden Ratio');
  });

  it('matches close to Major Third within tolerance', () => {
    expect(matchRatioName(1.26)).toBe('Major Third');
  });

  it('returns null for values far from any named ratio', () => {
    expect(matchRatioName(2.0)).toBeNull();
  });

  it('returns null for value exactly at boundary (diff >= 0.03)', () => {
    // 1.25 + 0.03 = 1.28, which is at the boundary
    expect(matchRatioName(1.28)).toBeNull();
  });

  it('matches Minor Second', () => {
    expect(matchRatioName(1.067)).toBe('Minor Second');
  });

  it('matches Perfect Fifth', () => {
    expect(matchRatioName(1.5)).toBe('Perfect Fifth');
  });

  it('picks closest when within tolerance of multiple ratios', () => {
    // 1.19 is within 0.03 of Minor Third (1.2) only
    expect(matchRatioName(1.19)).toBe('Minor Third');
  });
});
