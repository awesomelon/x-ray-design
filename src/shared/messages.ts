import type { FeatureId } from './types';

export type Message =
  | { type: 'TOGGLE_FEATURE'; feature: FeatureId; enabled: boolean }
  | { type: 'FEATURE_STATE_CHANGED'; feature: FeatureId; enabled: boolean }
  | { type: 'CONTENT_READY' };

export function isMessage(value: unknown): value is Message {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as Message).type === 'string'
  );
}

/** Suppress closed-port errors, warn on real errors */
export function swallowDisconnect(err: unknown): void {
  if (err instanceof Error && err.message.includes('Receiving end does not exist')) return;
  if (err instanceof Error && err.message.includes('Could not establish connection')) return;
  console.warn('[Snap]', err);
}
