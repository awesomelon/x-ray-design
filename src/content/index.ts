import { isMessage, type Message } from '../shared/messages';
import type { FeatureId } from '../shared/types';
import { activateSkeleton, deactivateSkeleton } from './modules/skeleton-view';
import { activateTypography, deactivateTypography } from './modules/typography-extractor';
import { activateContrast, deactivateContrast } from './modules/contrast-analyzer';
import { activateGrid, deactivateGrid, applyGridSettings } from './modules/grid-overlay';
import { activateInspect, deactivateInspect } from './modules/hover-inspect';

const activeFeatures = new Set<FeatureId>();

const featureMap: Record<FeatureId, { activate: () => void; deactivate: () => void }> = {
  skeleton: { activate: activateSkeleton, deactivate: deactivateSkeleton },
  typography: { activate: activateTypography, deactivate: deactivateTypography },
  contrast: { activate: activateContrast, deactivate: deactivateContrast },
  grid: { activate: activateGrid, deactivate: deactivateGrid },
  inspect: { activate: activateInspect, deactivate: deactivateInspect },
};

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (!isMessage(message)) return;

  switch (message.type) {
    case 'TOGGLE_FEATURE': {
      const { feature, enabled } = message;
      const mod = featureMap[feature];
      if (enabled) {
        mod.activate();
        activeFeatures.add(feature);
      } else {
        mod.deactivate();
        activeFeatures.delete(feature);
      }
      const reply: Message = {
        type: 'FEATURE_STATE_CHANGED',
        feature,
        enabled,
      };
      chrome.runtime.sendMessage(reply).catch(() => {});
      break;
    }

    case 'REQUEST_REPORT': {
      const { feature } = message;
      if (activeFeatures.has(feature)) {
        featureMap[feature].activate();
      }
      break;
    }

    case 'UPDATE_GRID_SETTINGS': {
      if (activeFeatures.has('grid')) {
        applyGridSettings(message.data);
      }
      break;
    }
  }
});
