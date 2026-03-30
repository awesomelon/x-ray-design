export type CSSProperty =
  | 'width' | 'height'
  | 'marginTop' | 'marginRight' | 'marginBottom' | 'marginLeft'
  | 'paddingTop' | 'paddingRight' | 'paddingBottom' | 'paddingLeft'
  | 'gap' | 'borderRadius';

export interface CSSPropDef {
  prop: CSSProperty;
  label: string;
}

export const CSS_PROPS: CSSPropDef[] = [
  { prop: 'width', label: 'W' },
  { prop: 'height', label: 'H' },
  { prop: 'marginTop', label: 'M-top' },
  { prop: 'marginRight', label: 'M-right' },
  { prop: 'marginBottom', label: 'M-bot' },
  { prop: 'marginLeft', label: 'M-left' },
  { prop: 'paddingTop', label: 'P-top' },
  { prop: 'paddingRight', label: 'P-right' },
  { prop: 'paddingBottom', label: 'P-bot' },
  { prop: 'paddingLeft', label: 'P-left' },
  { prop: 'gap', label: 'Gap' },
  { prop: 'borderRadius', label: 'Radius' },
];

export function readProperties(el: HTMLElement): Record<CSSProperty, string> {
  const cs = getComputedStyle(el);
  const result = {} as Record<CSSProperty, string>;
  for (const def of CSS_PROPS) {
    const raw = cs.getPropertyValue(toKebab(def.prop));
    result[def.prop] = parseNumeric(raw);
  }
  return result;
}

export function applyProperty(el: HTMLElement, prop: CSSProperty, value: string): void {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === 'auto') {
    el.style.setProperty(toKebab(prop), trimmed === 'auto' ? 'auto' : '');
    return;
  }
  // Pure number (no unit) → append px; otherwise use as-is
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    el.style.setProperty(toKebab(prop), trimmed + 'px');
  } else {
    el.style.setProperty(toKebab(prop), trimmed);
  }
}

function toKebab(prop: string): string {
  return prop.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
}

function parseNumeric(raw: string): string {
  const num = parseFloat(raw);
  if (isNaN(num)) return raw;
  // Preserve sub-pixel accuracy: show up to 1 decimal, strip trailing .0
  const rounded = Math.round(num * 10) / 10;
  return rounded === Math.floor(rounded) ? String(rounded) : rounded.toFixed(1);
}
