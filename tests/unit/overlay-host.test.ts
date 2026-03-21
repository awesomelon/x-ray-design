import { describe, it, expect, afterEach } from 'vitest';
import {
  getOverlayRoot,
  getFeatureLayer,
  clearFeatureLayer,
  removeFeatureLayer,
  destroyOverlay,
} from '../../src/content/overlay-host';

describe('overlay-host', () => {
  afterEach(() => {
    destroyOverlay();
  });

  describe('getOverlayRoot', () => {
    it('creates shadow root on first call', () => {
      const root = getOverlayRoot();
      expect(root).toBeInstanceOf(ShadowRoot);
    });

    it('returns same root on subsequent calls', () => {
      const root1 = getOverlayRoot();
      const root2 = getOverlayRoot();
      expect(root1).toBe(root2);
    });

    it('attaches host element to document', () => {
      getOverlayRoot();
      const host = document.querySelector('x-ray-overlay');
      expect(host).not.toBeNull();
      expect(host?.style.position).toBe('fixed');
    });

    it('includes style element in shadow root', () => {
      const root = getOverlayRoot();
      const style = root.querySelector('style');
      expect(style).not.toBeNull();
      expect(style?.textContent).toContain('xray-drag-highlight');
    });
  });

  describe('getFeatureLayer', () => {
    it('creates a new div layer', () => {
      const layer = getFeatureLayer('test');
      expect(layer).toBeInstanceOf(HTMLDivElement);
      expect(layer.id).toBe('xray-layer-test');
    });

    it('returns same layer on repeated calls', () => {
      const layer1 = getFeatureLayer('test');
      const layer2 = getFeatureLayer('test');
      expect(layer1).toBe(layer2);
    });

    it('creates separate layers for different IDs', () => {
      const layerA = getFeatureLayer('a');
      const layerB = getFeatureLayer('b');
      expect(layerA).not.toBe(layerB);
    });
  });

  describe('clearFeatureLayer', () => {
    it('removes children from layer', () => {
      const layer = getFeatureLayer('test');
      const child = document.createElement('span');
      layer.appendChild(child);
      expect(layer.children.length).toBe(1);
      clearFeatureLayer('test');
      expect(layer.children.length).toBe(0);
    });
  });

  describe('removeFeatureLayer', () => {
    it('removes layer from DOM and cache', () => {
      const layer = getFeatureLayer('test');
      expect(layer.isConnected).toBe(true);
      removeFeatureLayer('test');
      expect(layer.isConnected).toBe(false);
    });

    it('creates new layer after removal', () => {
      const layer1 = getFeatureLayer('test');
      removeFeatureLayer('test');
      const layer2 = getFeatureLayer('test');
      expect(layer1).not.toBe(layer2);
    });
  });

  describe('destroyOverlay', () => {
    it('removes host element from document', () => {
      getOverlayRoot();
      expect(document.querySelector('x-ray-overlay')).not.toBeNull();
      destroyOverlay();
      expect(document.querySelector('x-ray-overlay')).toBeNull();
    });

    it('re-creates everything after destroy', () => {
      const root1 = getOverlayRoot();
      destroyOverlay();
      const root2 = getOverlayRoot();
      expect(root1).not.toBe(root2);
    });
  });
});
