// Constructores de opciones ECharts (se ejecutan en build; el resultado se serializa a JSON).
// Reglas de claridad: serie principal navy, meta amarilla discontinua, eje desde 0, leyenda sólo
// con más de una serie, etiquetas de valor sólo donde aportan.
// Convenciones que resuelve el cliente (src/scripts/charts.ts):
//  - "__surface__" / "__ink__" → color de superficie / tinta del tema activo.
//  - `labelPoints: "ends"`      → etiqueta sólo el último punto con dato y el máximo (tras filtrar por año).
//  - formateadores de eje/tooltip según data-format del componente Chart (tooltip con diferencia vs meta).
import type { EChartsOption, SeriesOption } from "echarts";
import { ACCENT, BRAND_YELLOW, META, NEUTRAL_BAR } from "./colors";

type N = number | null;
export const SURFACE = "__surface__";
export const INK = "__ink__";

const legendBase = { top: 0, left: 0, icon: "roundRect", itemWidth: 14, itemHeight: 4, itemGap: 16 } as const;
const legendFor = (n: number) => (n > 1 ? { ...legendBase } : { show: false });
const grid = (hasLegend: boolean, right = 20) => ({ left: 4, right, top: hasLegend ? 40 : 18, bottom: 4, containLabel: true });
const valueAxis = { type: "value" as const, min: 0, splitNumber: 4 };

export interface LineDef { name: string; data: N[]; color?: string; area?: boolean; labels?: "all" | "ends" | "none" }

/** Serie principal (navy por defecto). */
export function line(d: LineDef): SeriesOption {
  const color = d.color ?? ACCENT;
  const n = d.data.filter((x) => x != null).length;
  return {
    type: "line",
    name: d.name,
    data: d.data,
    connectNulls: false,
    showSymbol: n <= 12,
    symbol: "circle",
    symbolSize: n <= 12 ? 8 : 5,
    lineStyle: { width: 2.5, color },
    itemStyle: { color },
    areaStyle: d.area ? { color, opacity: 0.07 } : undefined,
    label: { show: d.labels === "all", position: "top", fontSize: 11, fontWeight: "bold", color: INK },
    ...(d.labels === "ends" ? { labelPoints: "ends" } : {}),
    emphasis: { focus: "series" },
  } as SeriesOption;
}

/** Meta: siempre amarilla y discontinua. */
export function metaLine(data: N[], name = "Meta", opts: { step?: boolean; labels?: boolean } = {}): SeriesOption {
  return {
    type: "line",
    name,
    data,
    connectNulls: false,
    step: opts.step === false ? false : "middle",
    showSymbol: !!opts.labels,
    symbol: "circle",
    symbolSize: 6,
    lineStyle: { width: 2, type: "dashed", color: META },
    itemStyle: { color: META },
    label: { show: !!opts.labels, position: "bottom", fontSize: 11, color: INK },
    z: 1,
  };
}

/** Serie temporal / categórica con eje Y desde 0. */
export function lines(categories: string[], series: SeriesOption[], opts: { boundaryGap?: boolean } = {}): EChartsOption {
  const hasLegend = series.length > 1;
  return {
    legend: legendFor(series.length),
    grid: grid(hasLegend, 28),
    tooltip: { trigger: "axis", axisPointer: { type: "line" } },
    xAxis: { type: "category", data: categories, boundaryGap: opts.boundaryGap ?? false, axisTick: { show: false } },
    yAxis: valueAxis,
    series,
  };
}

/** Mini gráfico para tarjetas: sin ejes ni rejilla, con tooltip. */
export function sparkline(categories: string[], series: SeriesOption[]): EChartsOption {
  return {
    grid: { left: 6, right: 6, top: 18, bottom: 4 },
    tooltip: { trigger: "axis", axisPointer: { type: "line" }, confine: true },
    xAxis: { type: "category", data: categories, show: false, boundaryGap: false },
    yAxis: { type: "value", min: 0, show: false },
    series,
  };
}

export interface BarDef { name: string; data: N[]; color: string }

export function bars(categories: string[], defs: BarDef[], opts: { stacked?: boolean } = {}): EChartsOption {
  const stacked = !!opts.stacked;
  return {
    legend: legendFor(defs.length),
    grid: grid(defs.length > 1),
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "category", data: categories, axisTick: { show: false } },
    yAxis: { ...valueAxis, minInterval: 1 },
    series: defs.map<SeriesOption>((d, i) => ({
      type: "bar",
      name: d.name,
      data: d.data,
      stack: stacked ? "total" : undefined,
      barMaxWidth: 28,
      itemStyle: {
        color: d.color,
        borderRadius: stacked ? (i === defs.length - 1 ? [4, 4, 0, 0] : 0) : [4, 4, 0, 0],
        borderColor: SURFACE,
        borderWidth: stacked ? 1 : 0,
      },
      emphasis: { focus: "series" },
    })),
  };
}

/** Barras horizontales ordenadas. Con `highlight`, esa categoría va en amarillo y el resto en navy. */
export function hbar(
  categories: string[], values: N[],
  opts: { highlight?: string; color?: string; colors?: string[]; name?: string; barWidth?: number } = {},
): EChartsOption {
  const base = opts.color ?? NEUTRAL_BAR;
  return {
    grid: { left: 4, right: 44, top: 4, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { ...valueAxis, minInterval: 1 },
    yAxis: { type: "category", data: categories, axisTick: { show: false }, axisLabel: { fontSize: 11 } },
    series: [{
      type: "bar",
      name: opts.name ?? "Valor",
      barMaxWidth: opts.barWidth ?? 14,
      data: values.map((v, i) => ({
        value: v,
        itemStyle: {
          color: opts.colors?.[i] ?? (opts.highlight && categories[i] === opts.highlight ? BRAND_YELLOW : base),
        },
      })),
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: "right", fontSize: 11, color: INK },
    }],
  };
}
