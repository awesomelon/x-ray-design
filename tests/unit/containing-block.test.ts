import { describe, it, expect } from 'vitest';
import { shouldIgnore } from '../../src/content/modules/drag/drag-core';

// createsContainingBlock and getContainingBlockOffset are not exported,
// but we can test the exported promoteToFixed behavior that depends on them.
// The shouldIgnore tests already exist — this file tests additional edge cases.

describe('shouldIgnore — additional edge cases', () => {
  it('ignores HEAD element', () => {
    const head = document.createElement('head');
    expect(shouldIgnore(head)).toBe(true);
  });

  it('ignores LINK element', () => {
    const link = document.createElement('link');
    expect(shouldIgnore(link)).toBe(true);
  });

  it('ignores META element', () => {
    const meta = document.createElement('meta');
    expect(shouldIgnore(meta)).toBe(true);
  });

  it('ignores NOSCRIPT element', () => {
    const noscript = document.createElement('noscript');
    expect(shouldIgnore(noscript)).toBe(true);
  });

  it('allows A (anchor) element', () => {
    const a = document.createElement('a');
    expect(shouldIgnore(a)).toBe(false);
  });

  it('allows SECTION element', () => {
    const section = document.createElement('section');
    expect(shouldIgnore(section)).toBe(false);
  });

  it('allows nested div outside overlay', () => {
    const container = document.createElement('main');
    const nested = document.createElement('div');
    container.appendChild(nested);
    expect(shouldIgnore(nested)).toBe(false);
  });
});
