import { describe, it, expect } from 'vitest';
import {
  parseColor,
  relativeLuminance,
  contrastRatio,
  meetsWCAG_AA,
} from '../../src/shared/color-utils';

describe('parseColor', () => {
  it('parses rgb() format', () => {
    expect(parseColor('rgb(255, 0, 128)')).toEqual([255, 0, 128]);
  });

  it('parses rgba() format', () => {
    expect(parseColor('rgba(100, 200, 50, 0.5)')).toEqual([100, 200, 50]);
  });

  it('parses #RRGGBB hex', () => {
    expect(parseColor('#ff0080')).toEqual([255, 0, 128]);
  });

  it('parses #RGB shorthand hex', () => {
    expect(parseColor('#f08')).toEqual([255, 0, 136]);
  });

  it('returns black for unrecognized format', () => {
    expect(parseColor('unknown')).toEqual([0, 0, 0]);
  });
});

describe('relativeLuminance', () => {
  it('white has luminance ~1', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1, 2);
  });

  it('black has luminance ~0', () => {
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 2);
  });
});

describe('contrastRatio', () => {
  it('white on black gives 21:1', () => {
    const lWhite = relativeLuminance(255, 255, 255);
    const lBlack = relativeLuminance(0, 0, 0);
    expect(contrastRatio(lWhite, lBlack)).toBeCloseTo(21, 0);
  });

  it('same color gives 1:1', () => {
    const l = relativeLuminance(128, 128, 128);
    expect(contrastRatio(l, l)).toBeCloseTo(1, 2);
  });

  it('order of arguments does not matter', () => {
    const l1 = relativeLuminance(255, 255, 255);
    const l2 = relativeLuminance(0, 0, 0);
    expect(contrastRatio(l1, l2)).toBe(contrastRatio(l2, l1));
  });
});

describe('meetsWCAG_AA', () => {
  it('4.5:1 passes for normal text', () => {
    expect(meetsWCAG_AA(4.5)).toBe(true);
  });

  it('4.49:1 fails for normal text', () => {
    expect(meetsWCAG_AA(4.49)).toBe(false);
  });

  it('3:1 passes for large text', () => {
    expect(meetsWCAG_AA(3, true)).toBe(true);
  });

  it('2.9:1 fails for large text', () => {
    expect(meetsWCAG_AA(2.9, true)).toBe(false);
  });
});
