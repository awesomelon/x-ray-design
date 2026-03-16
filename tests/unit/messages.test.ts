import { describe, it, expect } from 'vitest';
import { isMessage } from '../../src/shared/messages';

describe('isMessage', () => {
  it('accepts valid TOGGLE_FEATURE message', () => {
    expect(isMessage({ type: 'TOGGLE_FEATURE', feature: 'drag', enabled: true })).toBe(true);
  });

  it('accepts valid FEATURE_STATE_CHANGED message', () => {
    expect(isMessage({ type: 'FEATURE_STATE_CHANGED', feature: 'grid', enabled: false })).toBe(true);
  });

  it('rejects null', () => {
    expect(isMessage(null)).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isMessage(undefined)).toBe(false);
  });

  it('rejects non-object', () => {
    expect(isMessage('string')).toBe(false);
    expect(isMessage(42)).toBe(false);
  });

  it('rejects object without type', () => {
    expect(isMessage({ feature: 'drag' })).toBe(false);
  });

  it('rejects object with non-string type', () => {
    expect(isMessage({ type: 123 })).toBe(false);
  });
});
