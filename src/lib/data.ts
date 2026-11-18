// Carga y agregación de datos en tiempo de build. Nada de este módulo llega al cliente
// salvo las series agregadas que las páginas serializan en los gráficos.
import raw from "../../datos/gkpi_ausentismo_rotacion_callao.json";
import { canonEmpresa } from "./colors";
import { MESES_LARGOS, fmtMes, indiceMes, type MesLargo } from "./format";

// ---------- Tipos del JSON ----------
type N = number | null;
type FilaMeses = { anio: number } & Record<MesLargo, N>;
interface Ratio { ceses: N; hc: N; pct: N }
interface AccionPlan {
  fecha: string | null; tema: string | null; planDeAccion: string | null; comentario?: string | null;
  responsable: string | null; fechaSolucion: string | null; estado: string | null;
}
interface FilaCD { cd: string; enero: N; febrero: N; marzo: N; abril: N; mayo: N; total: N }
interface GkpiData {
  fuente: string;
  nota: string;
  planDeAccion: { historicoMensual: { TURNOVER: FilaMeses[]; NHTO: FilaMeses[] }; acciones: AccionPlan[] };
  ceses: Record<string, string | number | null>[];
  headcount: Record<string, string | number | null>[];
  tablaDinamicaHC: { headcountPorCD: FilaCD[]; newHirePorCD: { datos: FilaCD[] } };
  consolidadoRotacion: {
    mensual: {
      mes: string;
      empresas: Record<string, { turnover: Ratio; newHireTurnover: Ratio }>;
      cdCallao: { turnoverPct: N; nhTurnoverPct: N; metaCD: N; nhToCD: N };
    }[];
    resumenAnualCD: { anio: number; turnoverPct: N; turnoverMetaCD: N; nhTurnoverPct: N; nhTurnoverMetaCD: N }[];
    turnoverPorEmpresa: Record<string, string | N>[];
    nhTurnoverPorEmpresa: Record<string, string | N>[];
  };
  consolidadoAusentismo: {
    mensual: {
      mes: string;
      empresas: Record<string, { diasAusentes: N; diasTrabajados: N; pct: N }>;
      ausentismoPct: N;
      metaCD: N;
    }[];
    resumenAnualCD: Record<string, N>[];
    porEmpresa: Record<string, N>[];
  };
  acciones: AccionPlan[];
}

const data = raw as unknown as GkpiData;

export const FUENTE = data.fuente;

// ---------- Utilidades ----------
const num = (v: unknown): N => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string => (v == null ? "" : String(v).trim());
const sum = (xs: N[]): N => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};
function contar<T>(xs: T[], key: (x: T) => string): { nombre: string; valor: number }[] {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return [...m.entries()].map(([nombre, valor]) => ({ nombre, valor })).sort((a, b) => b.valor - a.valor);
}

// ---------- Rotación mensual ----------
export const EMPRESAS_MENSUAL = ["BACKUS", "T77", "FORMAVENA", "ROSALES", "ATLAS", "ADRIANCAR", "LOGITRACK"] as const;

export interface MesRotacion {
  mes: string; label: string; anio: number; conDato: boolean;
  turnoverPct: N; nhTurnoverPct: N; meta: N; metaNH: N;
  ceses: Record<string, N>; hc: Record<string, N>;
}

export const rotacionMensual: MesRotacion[] = data.consolidadoRotacion.mensual.map((m) => {
  const ceses: Record<string, N> = {};
  const hc: Record<string, N> = {};
  for (const [k, v] of Object.entries(m.empresas)) {
    ceses[canonEmpresa(k)] = num(v.turnover.ceses);
    hc[canonEmpresa(k)] = num(v.turnover.hc);
  }
  // Un mes "tiene dato" si al menos una empresa reporta HC. Si no, el 0 del Excel es un artefacto de fórmula.
  const conDato = Object.values(hc).some((x) => x != null);
  return {
    mes: m.mes, label: fmtMes(m.mes), anio: Number(m.mes.slice(0, 4)), conDato,
    turnoverPct: conDato ? num(m.cdCallao.turnoverPct) : null,
    nhTurnoverPct: conDato ? num(m.cdCallao.nhTurnoverPct) : null,
    meta: num(m.cdCallao.metaCD), metaNH: num(m.cdCallao.nhToCD),
    ceses, hc,
  };
});

export const ultimoMesRotacion = [...rotacionMensual].reverse().find((m) => m.conDato) ?? rotacionMensual[rotacionMensual.length - 1]!;

// ---------- Ausentismo mensual ----------
export interface MesAusentismo {
  mes: string; label: string; anio: number; conDato: boolean;
  pct: N; meta: N; diasAusentes: Record<string, N>; diasTrabajados: Record<string, N>; pctEmpresa: Record<string, N>;
}

export const ausentismoMensual: MesAusentismo[] = data.consolidadoAusentismo.mensual.map((m) => {
  const diasAusentes: Record<string, N> = {};
  const diasTrabajados: Record<string, N> = {};
  const pctEmpresa: Record<string, N> = {};
  for (const [k, v] of Object.entries(m.empresas)) {
    const e = canonEmpresa(k);
    diasAusentes[e] = num(v.diasAusentes);
    diasTrabajados[e] = num(v.diasTrabajados);
    // Sin días trabajados el % no es calculable: hueco, no cero.
    pctEmpresa[e] = diasTrabajados[e] ? num(v.pct) : null;
  }
  const conDato = Object.values(diasTrabajados).some((x) => x != null);
  return {
    mes: m.mes, label: fmtMes(m.mes), anio: Number(m.mes.slice(0, 4)), conDato,
    pct: conDato ? num(m.ausentismoPct) : null, meta: num(m.metaCD),
    diasAusentes, diasTrabajados, pctEmpresa,
  };
});

export const ultimoMesAusentismo = [...ausentismoMensual].reverse().find((m) => m.conDato) ?? ausentismoMensual[ausentismoMensual.length - 1]!;

export const ANIOS = [...new Set(rotacionMensual.map((m) => m.anio))];

// ---------- Resúmenes anuales ----------
export const resumenRotacion = data.consolidadoRotacion.resumenAnualCD.map((r) => ({
  anio: r.anio, turnover: num(r.turnoverPct), metaTurnover: num(r.turnoverMetaCD),
  nhTurnover: num(r.nhTurnoverPct), metaNH: num(r.nhTurnoverMetaCD),
}));

export const resumenAusentismo = data.consolidadoAusentismo.resumenAnualCD.map((r) => ({
  anio: Number(r.anio),
  // En el Excel la columna se llama "ausentismo % CD Rimac" aunque la hoja es de CD Callao.
  pct: num(r.ausentismoPctCDRimac ?? r.ausentismoPct),
  meta: num(r.metaCD),
}));

function porEmpresaAnual(filas: Record<string, string | N>[]) {
  const anios = Object.keys(filas[0] ?? {}).filter((k) => /^\d{4}$/.test(k)).sort();
  const empresas = filas.filter((f) => str(f.empresa) !== "META").map((f) => ({
    empresa: canonEmpresa(str(f.empresa)),
    valores: anios.map((a) => num(f[a])),
  }));
  const metaFila = filas.find((f) => str(f.empresa) === "META");
  return { anios, empresas, meta: anios.map((a) => (metaFila ? num(metaFila[a]) : null)) };
}

export const turnoverPorEmpresa = porEmpresaAnual(data.consolidadoRotacion.turnoverPorEmpresa);
export const nhTurnoverPorEmpresa = porEmpresaAnual(data.consolidadoRotacion.nhTurnoverPorEmpresa);

/** Ausentismo % anual por empresa. Valores > 100 % son celdas inválidas del Excel → null. */
export const ausentismoPorEmpresa = (() => {
  const filas = data.consolidadoAusentismo.porEmpresa;
  const empresas = Object.keys(filas[0] ?? {}).filter((k) => k !== "anio" && k !== "metaPct");
  const invalidas: string[] = [];
  const rows = filas.map((f) => ({
    anio: Number(f.anio),
    meta: num(f.metaPct),
    valores: Object.fromEntries(empresas.map((e) => {
      const v = num(f[e]);
      if (v != null && v > 1) { invalidas.push(`${e} ${f.anio}: ${v}`); return [e, null]; }
      return [e, v];
    })) as Record<string, N>,
  }));
  return { empresas, rows, invalidas };
})();

// ---------- Histórico 2021–2023 ----------
export const historico = (() => {
  const h = data.planDeAccion.historicoMensual;
  const tieneDato = (f: FilaMeses) => MESES_LARGOS.some((m) => f[m] != null);
  const map = (tipo: string, filas: FilaMeses[]) =>
    filas.filter(tieneDato).map((f) => ({ fila: `${tipo} ${f.anio}`, valores: MESES_LARGOS.map((m) => num(f[m])) }));
  return [...map("Turnover", h.TURNOVER), ...map("NHTO", h.NHTO)];
})();

// ---------- Ceses (hoja nacional) ----------
const MOTIVO_ES: Record<string, string> = {
  "End of contract": "Fin de contrato",
  "Resignation - Personal reason": "Renuncia (motivo personal)",
  Sizing: "Redimensionamiento",
  "Unsuccessfull Probation": "Periodo de prueba no superado",
  "Work Abandonment": "Abandono de trabajo",
  "Poor Performance": "Bajo desempeño",
  "Resign - Transfer intercompany": "Renuncia (traslado intercompañía)",
};
const CLASE_ES: Record<string, string> = {
  "Termination-Involuntary": "Involuntario",
  "Termination-Voluntary": "Voluntario",
};
const CONTRATO_ES: Record<string, string> = {
  "Fixed term contract": "Plazo fijo",
  Permanent: "Indeterminado",
};
const CD_ALIAS: Record<string, string> = { "CD Pto Maldonado": "CD Pto Maldo" };
const cdNorm = (s: string) => CD_ALIAS[s] ?? s;

const ceses = data.ceses;
export const cesesResumen = {
  total: ceses.length,
  porMotivo: contar(ceses, (c) => MOTIVO_ES[str(c["Motivo de la medida"])] ?? (str(c["Motivo de la medida"]) || "Sin dato")),
  porClase: contar(ceses, (c) => CLASE_ES[str(c["Clase de medida"])] ?? (str(c["Clase de medida"]) || "Sin dato")),
  porCD: contar(ceses, (c) => cdNorm(str(c["Subdivisión de personal"])) || "Sin dato"),
  porContrato: contar(ceses, (c) => CONTRATO_ES[str(c["Contract Type Text"])] ?? (str(c["Contract Type Text"]) || "Sin dato")),
  porMes: MESES_LARGOS.map((m) => ({ mes: m, valor: ceses.filter((c) => str(c.Mes).toLowerCase() === m).length }))
    .filter((x) => x.valor > 0 || MESES_LARGOS.indexOf(x.mes) < 5),
  turnoverSi: ceses.filter((c) => str(c.TO) === "SÍ").length,
  nhtoSi: ceses.filter((c) => str(c.NHTO) === "SÍ").length,
};

// ---------- Headcount (hoja nacional, agregada) ----------
const hcRows = data.headcount;
const MESES_HC = [...new Set(hcRows.map((r) => str(r.MES)))]
  .sort((a, b) => indiceMes(a) - indiceMes(b));
const EMPRESA_CORTA: Record<string, string> = {
  "UCP BACKUS Y JOHNSTON SAA": "UCP Backus y Johnston",
  "CERVECERIA SAN JUAN S.A.": "Cervecería San Juan",
};
const companias = [...new Set(hcRows.map((r) => str(r["OM Company Name"])))];

export const headcountMensual = {
  meses: MESES_HC.map((m) => m.slice(0, 3).toLowerCase()),
  mesesLargos: MESES_HC,
  porCompania: companias.map((c) => ({
    compania: EMPRESA_CORTA[c] ?? c,
    valores: MESES_HC.map((m) => hcRows.filter((r) => str(r.MES) === m && str(r["OM Company Name"]) === c).length),
  })),
  newHire: MESES_HC.map((m) => hcRows.filter((r) => str(r.MES) === m && str(r["NEW HIRE"]) === "SÍ").length),
  total: MESES_HC.map((m) => hcRows.filter((r) => str(r.MES) === m).length),
};

// ---------- Tablas dinámicas HC (T2) ----------
const ultimoMesTD = (["mayo", "abril", "marzo", "febrero", "enero"] as const).find((m) =>
  data.tablaDinamicaHC.headcountPorCD.some((f) => f[m] != null),
) ?? "mayo";

export const hcPorCD = {
  mes: ultimoMesTD,
  filas: data.tablaDinamicaHC.headcountPorCD
    .map((f) => ({ cd: f.cd, valor: num(f[ultimoMesTD]) }))
    .sort((a, b) => (a.valor ?? 0) - (b.valor ?? 0)),
};
export const newHirePorCD = data.tablaDinamicaHC.newHirePorCD.datos
  .map((f) => ({ cd: f.cd, valor: num(f.total) }))
  .filter((f) => f.valor != null && f.valor > 0)
  .sort((a, b) => (a.valor ?? 0) - (b.valor ?? 0));

// ---------- Acciones ----------
export type Estado = "Completado" | "En curso" | "Pendiente";
export interface Accion {
  fecha: string | null; tema: "Turnover" | "NH Turnover" | string; plan: string; empresa: string | null;
  responsable: string; fechaSolucion: string | null; estado: Estado | string; origen: string;
}
const temaNorm = (t: string) => (/^nh/i.test(t) ? "NH Turnover" : t || "Sin tema");
const estadoNorm = (e: string): string => {
  const u = e.toUpperCase();
  if (u.startsWith("COMPLET")) return "Completado";
  if (u === "EN CURSO") return "En curso";
  if (u.startsWith("PENDIENT")) return "Pendiente";
  return e || "Sin estado";
};
const toAccion = (a: AccionPlan, origen: string): Accion => ({
  fecha: a.fecha, tema: temaNorm(str(a.tema)), plan: str(a.planDeAccion), empresa: a.comentario ? str(a.comentario) : null,
  responsable: str(a.responsable), fechaSolucion: a.fechaSolucion, estado: estadoNorm(str(a.estado)), origen,
});

export const acciones: Accion[] = [
  ...data.planDeAccion.acciones.map((a) => toAccion(a, "Plan de acción")),
  ...data.acciones.map((a) => toAccion(a, "Acciones")),
].sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));

export const accionesResumen = {
  total: acciones.length,
  completadas: acciones.filter((a) => a.estado === "Completado").length,
  abiertas: acciones.filter((a) => a.estado !== "Completado").length,
};

// ---------- KPIs ----------
const anioRef = ultimoMesRotacion.anio;
const rotAnio = resumenRotacion.find((r) => r.anio === anioRef) ?? resumenRotacion[resumenRotacion.length - 1]!;
const ausAnio = resumenAusentismo.find((r) => r.anio === ultimoMesAusentismo.anio) ?? resumenAusentismo[resumenAusentismo.length - 1]!;

export const kpis = {
  anio: anioRef,
  turnover: rotAnio.turnover, turnoverMeta: rotAnio.metaTurnover,
  nhTurnover: rotAnio.nhTurnover, nhTurnoverMeta: rotAnio.metaNH,
  ausentismoAnio: ausAnio.anio, ausentismo: ausAnio.pct, ausentismoMeta: ausAnio.meta,
  hcCallao: sum(Object.values(ultimoMesRotacion.hc)), hcCallaoMes: ultimoMesRotacion.label,
  hcNacional: headcountMensual.total[headcountMensual.total.length - 1] ?? null,
  hcNacionalMes: headcountMensual.mesesLargos[headcountMensual.mesesLargos.length - 1] ?? "",
  ceses: cesesResumen.total,
  cesesVoluntarios: cesesResumen.porClase.find((c) => c.nombre === "Voluntario")?.valor ?? 0,
  accionesCompletadas: accionesResumen.completadas,
  accionesAbiertas: accionesResumen.abiertas,
};

// ---------- Series derivadas para las vistas por sección ----------

/** HC total del CD Callao por mes (suma de empresas; null si el mes no tiene dato). */
export const hcCallaoMensual = rotacionMensual.map((m) => ({ mes: m.mes, label: m.label, anio: m.anio, hc: m.conDato ? sum(Object.values(m.hc)) : null }));

/** Ceses del CD Callao por año (meses con dato). */
export const cesesCallaoPorAnio = ANIOS.map((a) => ({
  anio: a,
  ceses: rotacionMensual.filter((m) => m.anio === a && m.conDato)
    .reduce((s, m) => s + Object.values(m.ceses).reduce<number>((x, c) => x + (c ?? 0), 0), 0),
}));

/** Días ausentes por empresa, por año ("" = todos los años). */
export const diasAusentesPorEmpresa: Record<string, { empresa: string; dias: number }[]> = Object.fromEntries(
  ["", ...ANIOS.map(String)].map((anio) => {
    const meses = ausentismoMensual.filter((m) => m.conDato && (!anio || String(m.anio) === anio));
    const empresas = EMPRESAS_MENSUAL.map((e) => ({
      empresa: e as string,
      dias: meses.reduce((s, m) => s + (m.diasAusentes[e] ?? 0), 0),
      conDato: meses.some((m) => m.diasTrabajados[e] != null || m.diasAusentes[e] != null),
    }))
      .filter((x) => x.conDato)
      .map(({ empresa, dias }) => ({ empresa, dias }))
      .sort((a, b) => b.dias - a.dias);
    return [anio, empresas];
  }),
);

/** Ceses voluntarios vs involuntarios por mes (hoja Ceses; meses ene–may sin año en la fuente). */
export const cesesPorMesClase = (() => {
  const meses = MESES_LARGOS.filter((m) => ceses.some((c) => str(c.Mes).toLowerCase() === m) || MESES_LARGOS.indexOf(m) < 5);
  const contar2 = (m: string, clase: string) =>
    ceses.filter((c) => str(c.Mes).toLowerCase() === m && (CLASE_ES[str(c["Clase de medida"])] ?? "") === clase).length;
  return {
    meses: meses.map((m) => m.slice(0, 3)),
    voluntario: meses.map((m) => contar2(m, "Voluntario")),
    involuntario: meses.map((m) => contar2(m, "Involuntario")),
  };
})();
