export type FeatureId = 'typography' | 'contrast' | 'grid' | 'drag';

export interface TypographyScaleEntry {
  level: string;
  expected: number;
  actual: number;
  deviation: number; // percentage
}

export interface TypographyReport {
  baseFontSize: number;       // f_0
  ratio: number;              // r
  ratioName: string | null;   // e.g. "Major Third"
  scale: TypographyScaleEntry[];
  sizeFrequency: Record<number, number>; // fontSize -> count
}

export interface ContrastResult {
  selector: string;
  text: string;
  foreground: string;
  background: string;
  ratio: number;
  passes: boolean;
  rect: { top: number; left: number; width: number; height: number };
}

export interface ContrastReport {
  results: ContrastResult[];
  passCount: number;
  failCount: number;
}

export interface GridReport {
  containerMaxWidth: number | null;
  columns: number;
  columnWidth: number;
  gutterWidth: number;
  marginLeft: number;
  marginRight: number;
  baselineHeight: number | null;
}

export interface GridSettings {
  columns: number;
  gutterWidth: number;
  containerMaxWidth: number | null;
  marginLeft: number;
  marginRight: number;
  baselineHeight: number | null;
}
