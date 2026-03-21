import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock overlay-host before importing selection-state
vi.mock('../../src/content/overlay-host', () => {
  const layerEl = document.createElement('div');
  document.body.appendChild(layerEl);
  return {
    getFeatureLayer: () => layerEl,
  };
});

const {
  setSelected,
  getSelected,
  clearSelectionHighlight,
  refreshSelectionHighlight,
  mountKeyboardHandler,
  unmountKeyboardHandler,
} = await import('../../src/content/modules/drag/selection-state');

describe('selection-state', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    unmountKeyboardHandler();
  });

  describe('setSelected / getSelected', () => {
    it('sets and gets selected element', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.getBoundingClientRect = () => ({
        left: 10, top: 20, width: 100, height: 50,
        right: 110, bottom: 70, x: 10, y: 20, toJSON: () => ({}),
      });
      setSelected(el);
      expect(getSelected()).toBe(el);
    });

    it('clears selection when set to null', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.getBoundingClientRect = () => ({
        left: 10, top: 20, width: 100, height: 50,
        right: 110, bottom: 70, x: 10, y: 20, toJSON: () => ({}),
      });
      setSelected(el);
      setSelected(null);
      expect(getSelected()).toBeNull();
    });
  });

  describe('clearSelectionHighlight', () => {
    it('does not throw when no selection exists', () => {
      expect(() => clearSelectionHighlight()).not.toThrow();
    });
  });

  describe('refreshSelectionHighlight', () => {
    it('does not throw when no selection exists', () => {
      expect(() => refreshSelectionHighlight()).not.toThrow();
    });
  });

  describe('mountKeyboardHandler', () => {
    it('calls move callback on arrow key', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.getBoundingClientRect = () => ({
        left: 10, top: 20, width: 100, height: 50,
        right: 110, bottom: 70, x: 10, y: 20, toJSON: () => ({}),
      });
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      setSelected(el);

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).toHaveBeenCalledWith(el, 1, 0);
    });

    it('uses step=10 with shift key', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.getBoundingClientRect = () => ({
        left: 10, top: 20, width: 100, height: 50,
        right: 110, bottom: 70, x: 10, y: 20, toJSON: () => ({}),
      });
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      setSelected(el);

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).toHaveBeenCalledWith(el, 0, 10);
    });

    it('ignores non-arrow keys', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.getBoundingClientRect = () => ({
        left: 10, top: 20, width: 100, height: 50,
        right: 110, bottom: 70, x: 10, y: 20, toJSON: () => ({}),
      });
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      setSelected(el);

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).not.toHaveBeenCalled();
    });

    it('does nothing when no element selected', () => {
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      // No element selected
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).not.toHaveBeenCalled();
    });
  });

  describe('unmountKeyboardHandler', () => {
    it('clears selected element and stops listening', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.getBoundingClientRect = () => ({
        left: 10, top: 20, width: 100, height: 50,
        right: 110, bottom: 70, x: 10, y: 20, toJSON: () => ({}),
      });
      const moveCb = vi.fn();
      mountKeyboardHandler(moveCb);
      setSelected(el);
      unmountKeyboardHandler();

      expect(getSelected()).toBeNull();

      // Arrow keys should no longer trigger callback
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
      document.dispatchEvent(event);
      expect(moveCb).not.toHaveBeenCalled();
    });
  });
});
