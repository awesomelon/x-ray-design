import { describe, it, expect, afterEach, vi } from 'vitest';

// Mock overlay-host
vi.mock('../../src/content/overlay-host', () => {
  const layerEl = document.createElement('div');
  document.body.appendChild(layerEl);
  return {
    getFeatureLayer: () => layerEl,
  };
});

const { renderSnapGuides, clearSnapGuides } = await import(
  '../../src/content/modules/drag/snap-guides'
);

describe('snap-guides', () => {
  afterEach(() => {
    clearSnapGuides();
  });

  describe('renderSnapGuides', () => {
    it('creates vertical guide for X snap', () => {
      renderSnapGuides(120, null);
      const guide = document.querySelector('.xray-snap-guide-v');
      expect(guide).not.toBeNull();
      expect((guide as HTMLElement).style.left).toBe('120px');
      expect((guide as HTMLElement).style.opacity).toBe('1');
    });

    it('creates horizontal guide for Y snap', () => {
      renderSnapGuides(null, 48);
      const guide = document.querySelector('.xray-snap-guide-h');
      expect(guide).not.toBeNull();
      expect((guide as HTMLElement).style.top).toBe('48px');
      expect((guide as HTMLElement).style.opacity).toBe('1');
    });

    it('hides guides when snap is null', () => {
      renderSnapGuides(120, 48);
      renderSnapGuides(null, null);
      const guideV = document.querySelector('.xray-snap-guide-v') as HTMLElement;
      const guideH = document.querySelector('.xray-snap-guide-h') as HTMLElement;
      if (guideV) expect(guideV.style.opacity).toBe('0');
      if (guideH) expect(guideH.style.opacity).toBe('0');
    });

    it('updates position on subsequent calls', () => {
      renderSnapGuides(100, null);
      renderSnapGuides(200, null);
      const guide = document.querySelector('.xray-snap-guide-v') as HTMLElement;
      expect(guide.style.left).toBe('200px');
    });
  });

  describe('clearSnapGuides', () => {
    it('removes guides from DOM', () => {
      renderSnapGuides(100, 200);
      clearSnapGuides();
      expect(document.querySelector('.xray-snap-guide-v')).toBeNull();
      expect(document.querySelector('.xray-snap-guide-h')).toBeNull();
    });

    it('does not throw when no guides exist', () => {
      expect(() => clearSnapGuides()).not.toThrow();
    });
  });
});
