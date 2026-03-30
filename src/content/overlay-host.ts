const HOST_TAG = 'x-ray-overlay';

let hostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

const layerCache = new Map<string, HTMLDivElement>();

export function getOverlayRoot(): ShadowRoot {
  if (shadowRoot) return shadowRoot;

  hostElement = document.createElement(HOST_TAG);
  hostElement.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
  document.documentElement.appendChild(hostElement);
  shadowRoot = hostElement.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .xray-drag-highlight {
      position: fixed;
      border: 2px dashed #8b5cf6;
      background: rgba(139, 92, 246, 0.06);
      pointer-events: none;
      border-radius: 2px;
      outline: 1px solid rgba(255, 255, 255, 0.5);
      outline-offset: 1px;
    }
    .xray-drag-selected {
      position: fixed;
      border: 2px solid #8b5cf6;
      background: rgba(139, 92, 246, 0.10);
      pointer-events: none;
      border-radius: 2px;
      box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 0 0 0 3px rgba(139, 92, 246, 0.3);
    }
    .xray-snap-guide-v {
      position: fixed;
      top: 0;
      width: 1px;
      height: 100vh;
      background: #ec4899;
      pointer-events: none;
      box-shadow: 0 0 6px 1px rgba(236, 72, 153, 0.6);
      transition: opacity 0.15s ease-out;
    }
    .xray-snap-guide-h {
      position: fixed;
      left: 0;
      width: 100vw;
      height: 1px;
      background: #ec4899;
      pointer-events: none;
      box-shadow: 0 0 6px 1px rgba(236, 72, 153, 0.6);
      transition: opacity 0.15s ease-out;
    }
    @keyframes xray-snap-flash {
      0% { box-shadow: 0 0 12px 3px rgba(236, 72, 153, 0.9); }
      100% { box-shadow: 0 0 6px 1px rgba(236, 72, 153, 0.6); }
    }
    .xray-snap-flash {
      animation: xray-snap-flash 0.2s ease-out;
    }
    .xray-spacing-guide {
      position: fixed;
      background: #ec4899;
      pointer-events: none;
      border-style: dashed;
      border-color: #ec4899;
      border-width: 0;
      opacity: 0;
      transition: opacity 0.15s ease-out;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      color: #ec4899;
    }
    .xray-distance-label {
      position: fixed;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease-out;
      background: #ec4899;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
      line-height: 1.4;
    }
    .xray-connector-line {
      position: fixed;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease-out;
      border-color: #ec4899;
      border-style: dashed;
      border-width: 0;
    }
  `;
  shadowRoot.appendChild(style);

  return shadowRoot;
}

export function getFeatureLayer(featureId: string): HTMLDivElement {
  let layer = layerCache.get(featureId);
  if (layer && layer.isConnected) return layer;

  const root = getOverlayRoot();
  layer = document.createElement('div');
  layer.id = `xray-layer-${featureId}`;
  root.appendChild(layer);
  layerCache.set(featureId, layer);
  return layer;
}

export function clearFeatureLayer(featureId: string): void {
  const layer = layerCache.get(featureId);
  if (layer) layer.replaceChildren();
}

export function removeFeatureLayer(featureId: string): void {
  const layer = layerCache.get(featureId);
  if (layer) {
    layer.remove();
    layerCache.delete(featureId);
  }
}

export function destroyOverlay(): void {
  if (hostElement) {
    hostElement.remove();
    hostElement = null;
    shadowRoot = null;
    layerCache.clear();
  }
}
