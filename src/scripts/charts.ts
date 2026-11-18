// Inicializa en el cliente todos los gráficos `[data-chart]` de la página.
// La opción llega serializada en `data-option`; aquí se añaden formateadores, tema,
// filtro por año, redimensionado y descarga PNG.
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { DARK_MAP } from "../lib/colors";
import { fmtNum, fmtPctC } from "../lib/format";

echarts.use([BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

/** Etiqueta de eje en %: 2 decimales, o hasta 4 si el valor es muy pequeño (evita "0.03%" repetido). */
const fmtPctEje = (v: number): string => {
  if (!v) return "0%";
  const p = v * 100;
  const dec = Math.abs(p) >= 0.1 ? 2 : Math.abs(p) >= 0.01 ? 3 : 4;
  return `${Number(p.toFixed(dec))}%`;
};

type Opt = Record<string, any>;

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const THEMES = {
  light: { surface: "#ffffff", ink: "#0e1726", ink2: "#4a5568", muted: "#687385", grid: "#e8ebf0", axis: "#c5ccd8", tipBg: "#ffffff", tipBorder: "rgba(11,31,58,0.14)" },
  dark: { surface: "#111b2e", ink: "#eef2f8", ink2: "#b8c2d3", muted: "#8d99ad", grid: "#1f2c44", axis: "#34445f", tipBg: "#18243a", tipBorder: "rgba(255,255,255,0.12)" },
};
type Mode = keyof typeof THEMES;

function registerThemes() {
  for (const mode of Object.keys(THEMES) as Mode[]) {
    const t = THEMES[mode];
    const axis = {
      axisLine: { show: true, lineStyle: { color: t.axis } },
      axisTick: { lineStyle: { color: t.axis } },
      axisLabel: { color: t.muted, fontSize: 11 },
      splitLine: { lineStyle: { color: t.grid, width: 1 } },
      splitArea: { show: false },
    };
    echarts.registerTheme(`gk-${mode}`, {
      backgroundColor: "transparent",
      textStyle: { fontFamily: FONT, color: t.ink2 },
      legend: { textStyle: { color: t.ink2, fontSize: 12 }, pageTextStyle: { color: t.ink2 } },
      tooltip: {
        backgroundColor: t.tipBg, borderColor: t.tipBorder, borderWidth: 1,
        textStyle: { color: t.ink, fontSize: 12 }, extraCssText: "box-shadow:0 4px 16px rgba(0,0,0,.12);border-radius:8px;",
      },
      categoryAxis: { ...axis, splitLine: { show: false } },
      valueAxis: { ...axis, axisLine: { show: false } },
      visualMap: { textStyle: { color: t.muted } },
    });
  }
}
registerThemes();

const mode = (): Mode => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Reemplaza recursivamente marcadores y colores claros por los del tema activo. */
function themed<T>(v: T, m: Mode): T {
  if (typeof v === "string") {
    if (v === "__surface__") return THEMES[m].surface as unknown as T;
    if (v === "__ink__") return THEMES[m].ink2 as unknown as T;
    if (m === "dark") return (DARK_MAP[v.toLowerCase()] ?? v) as unknown as T;
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => themed(x, m)) as unknown as T;
  if (v && typeof v === "object") {
    const out: Opt = {};
    for (const [k, x] of Object.entries(v)) out[k] = themed(x, m);
    return out as T;
  }
  return v;
}

const asArray = (x: unknown): Opt[] => (Array.isArray(x) ? x : x ? [x as Opt] : []);

const valOf = (v: unknown): number | null => {
  const x = v && typeof v === "object" && !Array.isArray(v) ? (v as Opt).value : v;
  return typeof x === "number" && Number.isFinite(x) ? x : null;
};
const isMeta = (name: string) => /^meta/i.test(name);

function addFormatters(opt: Opt, format: string) {
  const pct = format === "pct" || format === "pctc";
  const f = pct ? (v: unknown) => fmtPctC(valOf(v)) : (v: unknown) => fmtNum(valOf(v));
  for (const ax of [...asArray(opt.xAxis), ...asArray(opt.yAxis)]) {
    if (ax.type === "value") ax.axisLabel = { ...(ax.axisLabel ?? {}), formatter: (v: number) => (pct ? fmtPctEje(v) : fmtNum(v)) };
  }
  const series = asArray(opt.series);
  const tip = (opt.tooltip ??= {});
  // Tooltip preciso: valor de cada serie + diferencia de la serie principal frente a la meta (pp).
  tip.formatter = (raw: any) => {
    const ps: any[] = Array.isArray(raw) ? raw : [raw];
    const head = ps[0]?.axisValueLabel ?? ps[0]?.name ?? "";
    const rows = ps.map((p) => `<div style="display:flex;justify-content:space-between;gap:16px">${p.marker}<span style="flex:1">${p.seriesName}</span><b>${f(p.value)}</b></div>`);
    const meta = ps.find((p) => isMeta(p.seriesName));
    const main = ps.find((p) => !isMeta(p.seriesName));
    const vm = valOf(meta?.value), vp = valOf(main?.value);
    if (pct && vm != null && vp != null) {
      const d = (vp - vm) * 100;
      const txt = d === 0 ? "igual a la meta" : `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(2)} pp ${d > 0 ? "sobre" : "bajo"} la meta`;
      rows.push(`<div style="margin-top:4px;opacity:.8">${txt}</div>`);
    }
    return `<div style="font-weight:600;margin-bottom:4px">${head}</div>${rows.join("")}`;
  };
  for (const s of series) {
    if (s.type === "line" || s.type === "bar") s.label = { ...(s.label ?? {}), formatter: (p: any) => f(p.value) };
  }
}

/** Etiqueta sólo el último punto con dato y el máximo de las series marcadas con labelPoints: "ends". */
function applyLabelPoints(opt: Opt) {
  for (const s of asArray(opt.series)) {
    if (s.labelPoints !== "ends") continue;
    delete s.labelPoints;
    if (s.showSymbol === false) { s.showSymbol = true; s.symbolSize = 0; }
    const vals: (number | null)[] = (s.data ?? []).map(valOf);
    let last = -1, max = -1;
    vals.forEach((v, i) => {
      if (v == null) return;
      last = i;
      if (max < 0 || v > (vals[max] ?? -Infinity)) max = i;
    });
    s.data = (s.data ?? []).map((d: unknown, i: number) =>
      i === last || i === max ? { value: valOf(d), label: { show: true }, symbol: "circle", symbolSize: 8 } : d);
  }
}

/** Recorta categorías y series al año elegido ("" = todos). */
function filterYear(opt: Opt, year: string): Opt {
  if (!year) return opt;
  const ax = asArray(opt.xAxis)[0];
  const cats: string[] = ax?.data ?? [];
  const idx = cats.map((c, i) => (c.endsWith(year) ? i : -1)).filter((i) => i >= 0);
  if (!idx.length) return opt;
  const [a, b] = [idx[0]!, idx[idx.length - 1]! + 1];
  const out: Opt = { ...opt, xAxis: { ...ax, data: cats.slice(a, b) } };
  out.series = asArray(opt.series).map((s) => (Array.isArray(s.data) && s.data.length === cats.length ? { ...s, data: s.data.slice(a, b) } : s));
  return out;
}

interface Entry { el: HTMLElement; chart: echarts.ECharts; base: Opt; byYear?: Record<string, Opt>; format: string }
const entries: Entry[] = [];

function render(e: Entry) {
  const m = mode();
  const year = e.el.dataset.yearFilter != null ? (document.querySelector<HTMLSelectElement>("[data-year-select]")?.value ?? "") : "";
  // Gráficos con una opción por año (data-options-by-year) o recortados por año (eje de meses).
  const src = e.byYear ? (e.byYear[year] ?? e.byYear[""] ?? e.base) : filterYear(e.base, year);
  const opt = themed(structuredClone(src), m);
  applyLabelPoints(opt);
  addFormatters(opt, e.format);
  e.chart.dispose();
  e.chart = echarts.init(e.el, `gk-${m}`, { renderer: "canvas" });
  e.chart.setOption(opt as echarts.EChartsCoreOption);
}

function init() {
  document.querySelectorAll<HTMLElement>("[data-chart]").forEach((el) => {
    if (entries.some((e) => e.el === el)) return;
    const base = JSON.parse(el.dataset.option ?? "{}") as Opt;
    const byYear = el.dataset.optionsByYear ? (JSON.parse(el.dataset.optionsByYear) as Record<string, Opt>) : undefined;
    const entry: Entry = { el, base, byYear, format: el.dataset.format ?? "num", chart: echarts.init(el) };
    entries.push(entry);
    render(entry);
    new ResizeObserver(() => entry.chart.resize()).observe(el);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-download]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const el = document.getElementById(btn.dataset.download ?? "");
      const entry = entries.find((e) => e.el === el);
      if (!entry) return;
      const url = entry.chart.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: THEMES[mode()].surface });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${btn.dataset.filename ?? "grafico"}.png`;
      a.click();
    });
  });

  document.querySelectorAll<HTMLSelectElement>("[data-year-select]").forEach((sel) => {
    sel.addEventListener("change", () => entries.filter((e) => e.el.dataset.yearFilter != null).forEach(render));
  });
}

document.addEventListener("themechange", () => entries.forEach(render));
init();
