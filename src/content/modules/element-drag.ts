import { mountGrid, unmountGrid, applySettings, getLastReport } from './drag/grid-renderer';
import { mountKeyboardHandler, unmountKeyboardHandler, setSelected } from './drag/selection-state';
import { initDragCore, teardownDragCore, nudgeElement } from './drag/drag-core';
import { removeFeatureLayer } from '../overlay-host';
import type { GridReport, GridSettings } from '@shared/types';

function sendGridReport(report: GridReport): void {
  chrome.runtime.sendMessage({ type: 'GRID_REPORT', data: report }).catch(() => {});
}

export function activateDrag(): void {
  const report = mountGrid();
  sendGridReport(report);
  mountKeyboardHandler(nudgeElement);
  initDragCore({
    getSnapGrid: getLastReport,
  });
}

export function deactivateDrag(): void {
  teardownDragCore();
  unmountKeyboardHandler();
  unmountGrid();
  setSelected(null);
  removeFeatureLayer('drag');
}

export function applyGridSettings(settings: GridSettings): void {
  const report = applySettings(settings);
  sendGridReport(report);
}
