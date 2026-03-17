export type FeatureId = 'drag';

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
