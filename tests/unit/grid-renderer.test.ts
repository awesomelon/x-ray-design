import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We test the pure-logic helpers by importing the module and exercising
// the public API in a jsdom environment.

// Mock chrome API
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
});

// Must import after chrome mock
const {
  mountGrid,
  unmountGrid,
  applySettings,
  getLastReport,
  resetToAutoDetect,
  setGridVisible,
} = await import('../../src/content/modules/drag/grid-renderer');

describe('grid-renderer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    unmountGrid();
  });

  describe('mountGrid', () => {
    it('returns a GridReport with valid numeric fields', () => {
      const report = mountGrid();
      expect(report).toBeDefined();
      expect(typeof report.columns).toBe('number');
      expect(typeof report.columnWidth).toBe('number');
      expect(typeof report.gutterWidth).toBe('number');
      expect(typeof report.marginLeft).toBe('number');
      expect(typeof report.marginRight).toBe('number');
      expect(report.columns).toBeGreaterThanOrEqual(1);
    });

    it('defaults to 12-column fallback on empty page', () => {
      const report = mountGrid();
      expect(report.columns).toBe(12);
      expect(report.gutterWidth).toBe(24);
    });
  });

  describe('applySettings', () => {
    it('updates grid with manual settings', () => {
      mountGrid();
      const report = applySettings({
        columns: 6,
        gutterWidth: 16,
        containerMaxWidth: 960,
        marginLeft: 40,
        marginRight: 40,
        baselineHeight: 20,
      });
      expect(report.columns).toBe(6);
      expect(report.gutterWidth).toBe(16);
      expect(report.containerMaxWidth).toBe(960);
      expect(report.baselineHeight).toBe(20);
    });

    it('computes correct column width from settings', () => {
      mountGrid();
      const report = applySettings({
        columns: 4,
        gutterWidth: 20,
        containerMaxWidth: 1000,
        marginLeft: 0,
        marginRight: 0,
        baselineHeight: null,
      });
      // contentWidth=1000, totalGutters=3*20=60, columnWidth=(1000-60)/4=235
      expect(report.columnWidth).toBe(235);
    });
  });

  describe('getLastReport', () => {
    it('returns null before mountGrid', () => {
      expect(getLastReport()).toBeNull();
    });

    it('returns report after mountGrid', () => {
      mountGrid();
      expect(getLastReport()).not.toBeNull();
    });
  });

  describe('resetToAutoDetect', () => {
    it('returns fresh auto-detected report', () => {
      mountGrid();
      applySettings({
        columns: 3,
        gutterWidth: 10,
        containerMaxWidth: 500,
        marginLeft: 0,
        marginRight: 0,
        baselineHeight: null,
      });
      const report = resetToAutoDetect();
      // Should revert to auto-detect defaults
      expect(report.columns).toBe(12);
    });
  });

  describe('unmountGrid', () => {
    it('clears lastReport after unmount', () => {
      mountGrid();
      unmountGrid();
      expect(getLastReport()).toBeNull();
    });
  });
});
