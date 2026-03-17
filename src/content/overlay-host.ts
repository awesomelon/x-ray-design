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
    }
    .xray-drag-selected {
      position: fixed;
      border: 2px solid #8b5cf6;
      background: rgba(139, 92, 246, 0.10);
      pointer-events: none;
      border-radius: 2px;
      box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.3);
    }
    .xray-grid-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    }
    .xray-grid-columns {
      position: absolute;
      top: 0;
      height: 100%;
      display: flex;
      gap: var(--xray-gutter, 0px);
    }
    .xray-grid-col {
      flex: 1;
      height: 100%;
      background: rgba(59, 130, 246, 0.08);
      border-left: 1px solid rgba(59, 130, 246, 0.18);
      border-right: 1px solid rgba(59, 130, 246, 0.18);
    }
    .xray-grid-baseline {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background-repeat: repeat;
      background-size: 100% var(--xray-baseline, 24px);
      background-image: linear-gradient(
        to bottom,
        rgba(239, 68, 68, 0.12) 1px,
        transparent 1px
      );
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
