// Plotly defaults shared by every tool: colours come from the CSS theme
// variables, so plots follow light/dark mode. Plotly is a global from the CDN.

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Current theme colours, read from shared/theme.css. */
export function themeColors() {
  const v = (n) => cssVar(`--${n}`);
  return {
    fg: v("fg"), muted: v("muted"), grid: v("plot-grid"), accent: v("accent"),
    curve: v("curve"), fit: v("fit"), midline: v("midline"), bounds: v("bounds"), period: v("period"), circle: v("circle"),
  };
}

export function axis(c, extra = {}) {
  return { zeroline: true, zerolinecolor: c.muted, gridcolor: c.grid, color: c.fg, ...extra };
}

export function layout(c, extra = {}) {
  return {
    paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", font: { color: c.fg },
    margin: { l: 50, r: 16, t: 16, b: 44 }, showlegend: false,
    ...extra,
  };
}

export const PLOT_CONFIG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["select2d", "lasso2d"] };

/** Horizontal or vertical line across the whole plot, as a layout shape. */
export function hline(y, color, dash = "dash", width = 1.5) {
  return { type: "line", xref: "paper", x0: 0, x1: 1, y0: y, y1: y, line: { color, width, dash } };
}
