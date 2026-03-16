import type { FeatureId, TypographyReport, ContrastReport, GridReport, GridSettings } from './types';

export type Message =
  | { type: 'TOGGLE_FEATURE'; feature: FeatureId; enabled: boolean }
  | { type: 'FEATURE_STATE_CHANGED'; feature: FeatureId; enabled: boolean }
  | { type: 'REQUEST_REPORT'; feature: FeatureId }
  | { type: 'TYPOGRAPHY_REPORT'; data: TypographyReport }
  | { type: 'CONTRAST_REPORT'; data: ContrastReport }
  | { type: 'GRID_REPORT'; data: GridReport }
  | { type: 'UPDATE_GRID_SETTINGS'; data: GridSettings };

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Message).type === 'string'
  );
}
