// Formateo compartido (servidor y cliente). Locale es-PE.

export const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre",
] as const;
export type MesLargo = (typeof MESES_LARGOS)[number];

export const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "set", "oct", "nov", "dic",
] as const;

const pctFmt = (min: number, max: number) =>
  new Intl.NumberFormat("es-PE", { style: "percent", minimumFractionDigits: min, maximumFractionDigits: max });
const PCT_1 = pctFmt(1, 1);
const PCT_2 = pctFmt(1, 2);
const NUM = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

export const SIN_DATO = "—";

/** Porcentaje desde decimal (0.04 → "4,0 %"). `null` → "—". */
export function fmtPct(v: number | null | undefined, decimales: 1 | 2 = 2): string {
  if (v == null || Number.isNaN(v)) return SIN_DATO;
  return (decimales === 1 ? PCT_1 : PCT_2).format(v);
}

export function fmtNum(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return SIN_DATO;
  return NUM.format(v);
}

/** "2023-01" → "ene 2023" */
export function fmtMes(ym: string): string {
  const [a, m] = ym.split("-");
  const i = Number(m) - 1;
  return `${MESES_CORTOS[i] ?? m} ${a}`;
}

/** "2025-08-05" → "05 ago 2025" */
export function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return SIN_DATO;
  const [a, m, d] = iso.split("-");
  const i = Number(m) - 1;
  return `${d} ${MESES_CORTOS[i] ?? m} ${a}`;
}

/** "Enero" | "enero" → índice 0..11 (o -1). */
export function indiceMes(nombre: string): number {
  return MESES_LARGOS.indexOf(nombre.trim().toLowerCase() as MesLargo);
}

const PCT_FIXED: Record<number, Intl.NumberFormat> = {};

/** Porcentaje compacto sin espacio ("0.14%"), decimales fijos. `null` → `vacio`. */
export function fmtPctC(v: number | null | undefined, decimales = 2, vacio = SIN_DATO): string {
  if (v == null || Number.isNaN(v)) return vacio;
  const f = (PCT_FIXED[decimales] ??= new Intl.NumberFormat("es-PE", {
    style: "percent", minimumFractionDigits: decimales, maximumFractionDigits: decimales,
  }));
  return f.format(v).replace(/\s/g, "");
}

/** Diferencia absoluta en puntos porcentuales ("0.45 pp"). */
export function fmtPP(diff: number, decimales = 2): string {
  const n = new Intl.NumberFormat("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
  return `${n.format(Math.abs(diff) * 100)} pp`;
}
