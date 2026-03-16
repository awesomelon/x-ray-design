export type FeatureId = 'skeleton' | 'typography' | 'contrast' | 'grid' | 'inspect';

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

export interface InspectInfo {
  tag: string;
  id: string;
  classes: string[];
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  padding: { top: number; right: number; bottom: number; left: number };
  fontSize: string;
  fontFamily: string;
  fontWeight: string;
  lineHeight: string;
  color: string;
  backgroundColor: string;
  display: string;
  position: string;
}

export interface GridSettings {
  columns: number;
  gutterWidth: number;
  containerMaxWidth: number | null;
  marginLeft: number;
  marginRight: number;
  baselineHeight: number | null;
}
