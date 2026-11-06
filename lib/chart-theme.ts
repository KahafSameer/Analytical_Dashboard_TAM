/**
 * Shared chart tokens. Series and status colors were checked with the dataviz palette validator
 * (lightness band, chroma floor, colorblind separation ΔE ≥ 13 between neighbours); gold and amber
 * sit below 3:1 contrast on white, so charts using them always carry a legend and a data table.
 */

export const SERIES_COLORS = {
  allocation: "#c9971a",
  release: "#4d8fc4",
  utilized: "#1f7a55",
} as const;

export const SCHEDULE_COLORS = {
  "in-progress": "#1f7a55",
  "past-end": "#d08a12",
  "not-started": "#4d8fc4",
} as const;

/** Single-series bars and highlights. */
export const PRIMARY_COLOR = "#1f7a55";
export const ATTENTION_COLOR = "#d08a12";
export const NEUTRAL_COLOR = "#b9c4bd";

export const AXIS_TICK = { fontSize: 11, fill: "#59665d" } as const;
export const GRID_STROKE = "#edf0ed";
export const TOOLTIP_STYLE = {
  borderRadius: 9,
  border: "1px solid #e6ebe7",
  boxShadow: "0 8px 26px rgba(24,44,33,.08)",
  fontSize: 11,
} as const;
export const TOOLTIP_LABEL_STYLE = { color: "#1f2937", fontWeight: 600, marginBottom: 4 } as const;

/** One hue, light → dark, for magnitude (heatmaps). */
const SEQUENTIAL_GREENS = ["#eef6f1", "#d3e9db", "#acd4ba", "#7db894", "#4a9668", "#236f4b", "#11533a"];

/**
 * Cell color for a value on a sequential scale. A square-root scale keeps small amounts visible
 * when a few districts dominate; text flips to white on the darker steps.
 */
export function heatCellStyle(value: number, max: number): { background: string; color: string } {
  if (!(value > 0) || !(max > 0)) return { background: "#f7f9f7", color: "#9aa39d" };
  const step = Math.min(SEQUENTIAL_GREENS.length - 1, Math.max(1, Math.ceil(Math.sqrt(value / max) * (SEQUENTIAL_GREENS.length - 1))));
  return { background: SEQUENTIAL_GREENS[step], color: step >= 4 ? "#ffffff" : "#1f3a2c" };
}

export function formatAxisMillions(value: number): string {
  if (value >= 1_000) return `${(value / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
