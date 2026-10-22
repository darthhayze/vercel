// Types for StageExplainer props.
export interface StageLegend { swatch: string; label: string }
export interface StageCtx { index: number; total: number; id: string }
export interface StageDef {
  id: string;
  title: string;
  /** one sentence, 22 words or fewer */
  caption: string;
  legend?: StageLegend[];
  note?: string;
  /** mono file or command names listed under the legend */
  files?: string[];
  /** returns the SVG inner markup (no <svg> wrapper) in an 800 wide box */
  scene: (ctx: StageCtx) => string;
  /** seconds of animation (the scrub range) */
  duration: number;
  /** scroll length of the pinned track: s, m or l (default m) */
  length?: 's' | 'm' | 'l';
  /** viewBox height, default 560 */
  viewHeight?: number;
  /** screen-reader description of what the drawing shows */
  desc?: string;
  /** optional alternate drawing for the static (no JS, reduced motion) view */
  reducedFinalFrame?: (ctx: StageCtx) => string;
}
