import type { FeatureId, GridReport, GridSettings } from './types';

export type Message =
  | { type: 'TOGGLE_FEATURE'; feature: FeatureId; enabled: boolean }
  | { type: 'FEATURE_STATE_CHANGED'; feature: FeatureId; enabled: boolean }
  | { type: 'GRID_REPORT'; data: GridReport }
  | { type: 'UPDATE_GRID_SETTINGS'; data: GridSettings }
  | { type: 'SET_GRID_VISIBLE'; visible: boolean }
  | { type: 'CONTENT_READY' };

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Message).type === 'string'
  );
}
