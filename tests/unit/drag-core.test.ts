import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldIgnore, initDragCore, teardownDragCore } from '../../src/content/modules/drag/drag-core';

// Mock overlay-host
vi.mock('../../src/content/overlay-host', () => {
  let layerEl: HTMLDivElement | null = null;
  return {
    getFeatureLayer: () => {
      if (!layerEl || !layerEl.isConnected) {
        layerEl = document.createElement('div');
        layerEl.id = 'mock-drag-layer';
        document.body.appendChild(layerEl);
      }
      return layerEl;
    },
  };
});

describe('shouldIgnore', () => {
  it('ignores BODY element', () => {
    expect(shouldIgnore(document.body)).toBe(true);
  });

  it('ignores HTML element', () => {
    expect(shouldIgnore(document.documentElement)).toBe(true);
  });

  it('ignores SCRIPT element', () => {
    const script = document.createElement('script');
    expect(shouldIgnore(script)).toBe(true);
  });

  it('ignores STYLE element', () => {
    const style = document.createElement('style');
    expect(shouldIgnore(style)).toBe(true);
  });

  it('ignores BR element', () => {
    const br = document.createElement('br');
    expect(shouldIgnore(br)).toBe(true);
  });

  it('allows DIV element', () => {
    const div = document.createElement('div');
    expect(shouldIgnore(div)).toBe(false);
  });

  it('allows SPAN element', () => {
    const span = document.createElement('span');
    expect(shouldIgnore(span)).toBe(false);
  });

  it('allows BUTTON element', () => {
    const button = document.createElement('button');
    expect(shouldIgnore(button)).toBe(false);
  });

  it('allows IMG element', () => {
    const img = document.createElement('img');
    expect(shouldIgnore(img)).toBe(false);
  });

  it('ignores non-HTMLElement (SVGElement)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    expect(shouldIgnore(svg)).toBe(true);
  });

  it('ignores element inside x-ray-overlay', () => {
    const overlay = document.createElement('x-ray-overlay');
    const child = document.createElement('div');
    overlay.appendChild(child);
    document.body.appendChild(overlay);
    try {
      expect(shouldIgnore(child)).toBe(true);
    } finally {
      overlay.remove();
    }
  });

  it('ignores x-ray-overlay host element', () => {
    const overlay = document.createElement('x-ray-overlay');
    document.body.appendChild(overlay);
    try {
      expect(shouldIgnore(overlay)).toBe(true);
    } finally {
      overlay.remove();
    }
  });

  it('allows element outside x-ray-overlay', () => {
    const container = document.createElement('div');
    const child = document.createElement('div');
    container.appendChild(child);
    document.body.appendChild(container);
    try {
      expect(shouldIgnore(child)).toBe(false);
    } finally {
      container.remove();
    }
  });
});

describe('onClick — empty space clears selection', () => {
  let getSelected: () => ReadonlySet<HTMLElement>;
  let replaceSelection: (el: HTMLElement | null) => void;

  beforeEach(async () => {
    document.body.innerHTML = '';
    const selState = await import('../../src/content/modules/drag/selection-state');
    getSelected = selState.getSelected;
    replaceSelection = selState.replaceSelection;
    initDragCore();
  });

  afterEach(() => {
    teardownDragCore();
  });

  it('clears selection when clicking on an ignored element (body)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({
      left: 10, top: 10, width: 100, height: 50,
      right: 110, bottom: 60, x: 10, y: 10, toJSON: () => ({}),
    });
    replaceSelection(el);
    expect(getSelected().size).toBe(1);

    const click = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(click, 'target', { value: document.body });
    document.dispatchEvent(click);

    expect(getSelected().size).toBe(0);
  });

  it('preserves selection when Ctrl+clicking on an ignored element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({
      left: 10, top: 10, width: 100, height: 50,
      right: 110, bottom: 60, x: 10, y: 10, toJSON: () => ({}),
    });
    replaceSelection(el);
    expect(getSelected().size).toBe(1);

    const click = new MouseEvent('click', { bubbles: true, ctrlKey: true });
    Object.defineProperty(click, 'target', { value: document.body });
    document.dispatchEvent(click);

    expect(getSelected().size).toBe(1);
  });

  it('preserves selection when Meta+clicking on an ignored element', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({
      left: 10, top: 10, width: 100, height: 50,
      right: 110, bottom: 60, x: 10, y: 10, toJSON: () => ({}),
    });
    replaceSelection(el);
    expect(getSelected().size).toBe(1);

    const click = new MouseEvent('click', { bubbles: true, metaKey: true });
    Object.defineProperty(click, 'target', { value: document.body });
    document.dispatchEvent(click);

    expect(getSelected().size).toBe(1);
  });

  it('preserves selection when clicking on x-ray-overlay (Shadow DOM passthrough)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = () => ({
      left: 10, top: 10, width: 100, height: 50,
      right: 110, bottom: 60, x: 10, y: 10, toJSON: () => ({}),
    });
    replaceSelection(el);
    expect(getSelected().size).toBe(1);

    const overlay = document.createElement('x-ray-overlay');
    document.body.appendChild(overlay);

    const click = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(click, 'target', { value: overlay });
    document.dispatchEvent(click);

    // Selection should NOT be cleared — overlay events pass through
    expect(getSelected().size).toBe(1);
    overlay.remove();
  });

  it('does not call preventDefault on mousedown targeting x-ray-overlay', () => {
    const overlay = document.createElement('x-ray-overlay');
    document.body.appendChild(overlay);

    const mousedown = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(mousedown, 'target', { value: overlay });
    const spy = vi.spyOn(mousedown, 'preventDefault');
    document.dispatchEvent(mousedown);

    // overlay events should pass through without preventDefault
    expect(spy).not.toHaveBeenCalled();
    overlay.remove();
  });
});
