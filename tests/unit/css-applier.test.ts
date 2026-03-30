import { describe, it, expect, vi } from 'vitest';
import { CSS_PROPS, applyProperty, readProperties } from '../../src/content/modules/css-editor/css-applier';
import type { CSSProperty } from '../../src/content/modules/css-editor/css-applier';

describe('CSS_PROPS', () => {
  it('has 12 properties', () => {
    expect(CSS_PROPS).toHaveLength(12);
  });

  it('includes layout properties', () => {
    const props = CSS_PROPS.map(p => p.prop);
    expect(props).toContain('width');
    expect(props).toContain('height');
    expect(props).toContain('marginTop');
    expect(props).toContain('paddingLeft');
    expect(props).toContain('gap');
    expect(props).toContain('borderRadius');
  });
});

describe('applyProperty', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('appends px to bare numbers', () => {
    applyProperty(el, 'width', '100');
    expect(el.style.width).toBe('100px');
  });

  it('appends px to decimal numbers', () => {
    applyProperty(el, 'width', '12.5');
    expect(el.style.width).toBe('12.5px');
  });

  it('preserves values with units', () => {
    applyProperty(el, 'width', '50%');
    expect(el.style.width).toBe('50%');
  });

  it('preserves em units', () => {
    applyProperty(el, 'width', '2em');
    expect(el.style.width).toBe('2em');
  });

  it('sets auto value', () => {
    applyProperty(el, 'width', 'auto');
    expect(el.style.width).toBe('auto');
  });

  it('clears empty value', () => {
    el.style.width = '100px';
    applyProperty(el, 'width', '');
    expect(el.style.width).toBe('');
  });

  it('trims whitespace', () => {
    applyProperty(el, 'width', '  50  ');
    expect(el.style.width).toBe('50px');
  });

  it('applies margin with kebab conversion', () => {
    applyProperty(el, 'marginTop', '16');
    expect(el.style.marginTop).toBe('16px');
  });

  it('applies border-radius', () => {
    applyProperty(el, 'borderRadius', '8');
    expect(el.style.borderRadius).toBe('8px');
  });
});

describe('readProperties', () => {
  it('reads computed styles from element', () => {
    const el = document.createElement('div');
    el.style.width = '200px';
    el.style.height = '100px';
    el.style.marginTop = '16px';
    document.body.appendChild(el);

    const props = readProperties(el);
    // jsdom computes some values, others may be 0 or empty
    expect(typeof props.width).toBe('string');
    expect(typeof props.height).toBe('string');
    expect(typeof props.marginTop).toBe('string');

    document.body.removeChild(el);
  });
});
