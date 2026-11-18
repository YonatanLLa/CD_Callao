// Paleta de marca: navy + amarillo. Todo el dashboard toma sus colores de aquí.
//  - Serie principal del CD: navy (azul claro en modo oscuro).
//  - Meta / objetivo y resaltados: amarillo (sólo marcas y rellenos, nunca texto sobre blanco).
//  - Empresas: color fijo por entidad, empezando por navy y siguiendo con tonos armónicos.
//    El amarillo queda reservado para la meta para que no se confunda con ninguna empresa.
// Orden validado con el validador de paleta (separación CVD y visión normal ≥ 15 entre vecinos).

export const BRAND_NAVY = "#0b1f3a";
export const BRAND_YELLOW = "#f5c400";

/** Serie principal (CD). */
export const ACCENT = BRAND_NAVY;
/** Serie secundaria del CD (p. ej. NH turnover o ausentismo junto a turnover). */
export const SECONDARY = "#3d7cc9";
/** Metas y objetivos (línea discontinua). */
export const META = BRAND_YELLOW;
/** Barras no resaltadas cuando se destaca una categoría. */
export const NEUTRAL_BAR = BRAND_NAVY;

/** Variante para modo oscuro de cada color claro (mismo tono, otro paso). */
export const DARK_MAP: Record<string, string> = {
  "#0b1f3a": "#9dbbe6", // navy → azul claro legible sobre fondo oscuro
  "#c27c0e": "#d9952e",
  "#3d7cc9": "#4f88d6",
  "#d9572b": "#e5713d",
  "#138a7e": "#2fa898",
  "#8a4fa8": "#a46ee0",
  "#8c8378": "#a8977f",
  "#a63d3d": "#d06060",
  "#0f9b8e": "#2fb8a8",
  "#7d6a14": "#b39a3a",
  "#b07a9a": "#c890b0",
  // Rampa secuencial (heatmap): en oscuro va de la superficie hacia el azul claro.
  "#eef2f8": "#18243a",
  "#b9c9e0": "#2a4470",
  "#6f8fb8": "#4f78b0",
  "#2f4f7f": "#86a7d6",
  "#0a1c35": "#d6e4f7",
};

export const EMPRESA_COLOR: Record<string, string> = {
  BACKUS: "#0b1f3a",     // navy
  T77: "#c27c0e",        // ocre
  FORMAVENA: "#3d7cc9",  // azul acero
  ROSALES: "#d9572b",    // naranja apagado
  ATLAS: "#138a7e",      // verde azulado
  ADRIANCAR: "#8a4fa8",  // ciruela
  LOGITRACK: "#8c8378",  // gris cálido
  // Empresas que sólo aparecen en los resúmenes anuales por empresa
  BREXIMAR: "#a63d3d",   // ladrillo
  GRODVAL: "#0f9b8e",    // turquesa
  "F & B": "#7d6a14",    // oliva
  SEGSOL: "#b07a9a",     // malva
};

/** Paleta categórica genérica (categorías que no son empresas: motivos, tipos…). */
export const CATEGORICAL = ["#0b1f3a", "#c27c0e", "#3d7cc9", "#d9572b", "#138a7e", "#8a4fa8", "#8c8378"];

/** Rampa secuencial navy (claro → oscuro) para heatmaps. */
export const SEQ_RAMP = ["#eef2f8", "#b9c9e0", "#6f8fb8", "#2f4f7f", "#0a1c35"];

/** Normaliza variantes de nombre ("LOGITRAK" → "LOGITRACK"). */
export function canonEmpresa(nombre: string): string {
  const n = nombre.trim().toUpperCase();
  if (n === "LOGITRAK") return "LOGITRACK";
  return n;
}

export function colorEmpresa(nombre: string): string {
  return EMPRESA_COLOR[canonEmpresa(nombre)] ?? "#8c8378";
}
