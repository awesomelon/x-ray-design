import { isMessage } from '../shared/messages';
import type { FeatureId } from '../shared/types';
import { activateDrag, deactivateDrag, applyGridSettings, setGridVisible } from './modules/element-drag';

const activeFeatures = new Set<FeatureId>();

const featureMap: Record<FeatureId, { activate: () => void; deactivate: () => void }> = {
  drag: { activate: activateDrag, deactivate: deactivateDrag },
};

chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).catch(() => {});

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
      chrome.runtime.sendMessage({
        type: 'FEATURE_STATE_CHANGED',
        feature,
        enabled,
      }).catch(() => {});
      break;
    }

    case 'UPDATE_GRID_SETTINGS': {
      applyGridSettings(message.data);
      break;
    }

    case 'SET_GRID_VISIBLE': {
      setGridVisible(message.visible);
      break;
    }
  }
});
