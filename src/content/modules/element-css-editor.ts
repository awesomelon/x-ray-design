import { initCssEditorCore, teardownCssEditorCore } from './css-editor/css-editor-core';
import { removeFeatureLayer } from '../overlay-host';

export function activateCssEditor(): void {
  initCssEditorCore();
}

export function deactivateCssEditor(): void {
  teardownCssEditorCore();
  removeFeatureLayer('css-editor');
}
