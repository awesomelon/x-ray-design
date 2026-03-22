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

export interface ElementRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface SpacingGuide {
  axis: 'x' | 'y';
  position: number;     // midpoint of the gap
  gap: number;           // pixel distance
  refA: ElementRect;     // element on one side
  refB: ElementRect;     // element on other side
}

export interface DistanceLabel {
  axis: 'x' | 'y';
  from: number;          // start position
  to: number;            // end position
  crossPos: number;      // perpendicular position for label placement
  distance: number;      // pixel value
}
