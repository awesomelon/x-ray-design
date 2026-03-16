const HOST_TAG = 'x-ray-overlay';

let hostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

// querySelector 대신 Map 캐시로 O(1) 레이어 조회
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
    .xray-badge {
      position: fixed;
      font: bold 10px/1 monospace;
      padding: 2px 4px;
      border-radius: 3px;
      color: #fff;
      pointer-events: none;
      z-index: 2147483647;
      white-space: nowrap;
    }
    .xray-badge--pass { background: #22c55e; }
    .xray-badge--fail { background: #ef4444; }
    .xray-margin-overlay {
      position: fixed;
      background: rgba(255, 165, 0, 0.3);
      border: 1px dashed rgba(255, 165, 0, 0.6);
      pointer-events: none;
    }
    .xray-padding-overlay {
      position: fixed;
      background: rgba(0, 128, 0, 0.25);
      border: 1px dashed rgba(0, 128, 0, 0.5);
      pointer-events: none;
    }
    .xray-spacing-label {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      font: bold 10px/1 monospace;
      color: #fff;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1;
    }
    .xray-spacing-label--margin {
      background: rgba(200, 120, 0, 0.92);
    }
    .xray-spacing-label--padding {
      background: rgba(0, 110, 0, 0.92);
    }
    .xray-spacing-label--float {
      top: -7px;
      left: 50%;
      transform: translateX(-50%);
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
    .xray-inspect-content {
      position: fixed;
      border: 2px solid #3b82f6;
      pointer-events: none;
      z-index: 2147483646;
    }
    .xray-inspect-margin {
      position: fixed;
      background: rgba(255, 165, 0, 0.25);
      pointer-events: none;
    }
    .xray-inspect-padding {
      position: fixed;
      background: rgba(0, 128, 0, 0.25);
      pointer-events: none;
    }
    .xray-inspect-tooltip {
      position: fixed;
      background: rgba(20, 20, 20, 0.92);
      color: #fff;
      font: 11px/1.5 monospace;
      padding: 6px 10px;
      border-radius: 5px;
      pointer-events: none;
      z-index: 2147483647;
      white-space: nowrap;
      max-width: 320px;
    }
    .xray-inspect-tooltip__tag { color: #93c5fd; font-weight: 700; }
    .xray-inspect-tooltip__dim { color: #fbbf24; }
    .xray-inspect-tooltip__spacing { display: flex; gap: 8px; margin-top: 2px; }
    .xray-inspect-tooltip__m { color: #fdba74; }
    .xray-inspect-tooltip__p { color: #86efac; }
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
