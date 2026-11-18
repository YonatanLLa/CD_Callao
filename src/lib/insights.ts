// Resúmenes por sección y vista general, generados a partir de los datos.
// Ningún número está escrito a mano: todo sale de src/lib/data.ts.
import { CD_NOMBRE, fraseConclusionNeutra, fraseConclusionPositiva } from "../config/resumen";
import {
  acciones, accionesResumen, ausentismoMensual, cesesCallaoPorAnio, cesesPorMesClase, cesesResumen, diasAusentesPorEmpresa,
  hcCallaoMensual, hcPorCD, headcountMensual, kpis, resumenAusentismo, resumenRotacion, rotacionMensual, turnoverPorEmpresa,
} from "./data";
import { MESES_LARGOS, fmtFecha, fmtNum, fmtPctC, fmtPP } from "./format";

type N = number | null;
export type Tono = "ok" | "alerta" | "neutral";
export interface Linea { html: string; tono: Exclude<Tono, "neutral"> }
export interface Kpi { label: string; value: string; detail?: string; status?: Tono; statusText?: string }

const b = (s: string) => `<b>${s}</b>`;
const listaY = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}`);
const plural = (n: number, s: string, p = `${s}s`) => `${fmtNum(n)} ${n === 1 ? s : p}`;

/** Valor y meta siempre con 2 decimales (fmtPctC muestra "<0.01%" para valores mínimos). */
export function par(v: number, meta: number): [string, string] {
  return [fmtPctC(v), fmtPctC(meta)];
}
const relacion = (v: number, meta: number) => (v < meta ? "por debajo de" : v > meta ? "por encima de" : "igual a");
const estadoMeta = (v: N, meta: N): { status: Tono; statusText: string } =>
  v == null || meta == null
    ? { status: "neutral", statusText: "Sin meta" }
    : v <= meta ? { status: "ok", statusText: "Dentro de la meta" } : { status: "alerta", statusText: "Sobre la meta" };

// =====================================================================
// ROTACIÓN
// =====================================================================
const anio = kpis.anio;
const rot = resumenRotacion.find((r) => r.anio === anio) ?? resumenRotacion[resumenRotacion.length - 1]!;
const rotPrev = resumenRotacion.find((r) => r.anio === anio - 1);
const anualConDato = resumenRotacion.filter((r) => r.turnover != null);
const mesesRot = rotacionMensual.filter((m) => m.anio === anio && m.conDato);
const rangoRot = mesesRot.length ? `${mesesRot[0]!.label} – ${mesesRot[mesesRot.length - 1]!.label}` : String(anio);
const cesesAnio = cesesCallaoPorAnio.find((c) => c.anio === anio)?.ceses ?? 0;

const empresaTop = (() => {
  const { anios, empresas } = turnoverPorEmpresa;
  const iUlt = anios.indexOf(String(anio));
  const enUlt = empresas.map((e) => ({ e: e.empresa, v: iUlt >= 0 ? e.valores[iUlt] ?? null : null })).filter((x) => (x.v ?? 0) > 0)
    .sort((a, c) => (c.v ?? 0) - (a.v ?? 0));
  let max = -1; const top: { e: string; anio: string }[] = [];
  empresas.forEach((e) => e.valores.forEach((v, i) => {
    if (v == null) return;
    if (v > max) { max = v; top.length = 0; }
    if (v === max) top.push({ e: e.empresa, anio: anios[i]! });
  }));
  return { enUlt, max, top };
})();

const rotKpiEmpresa: Kpi = empresaTop.enUlt.length
  ? { label: `Empresa con mayor turnover ${anio}`, value: empresaTop.enUlt[0]!.e, detail: fmtPctC(empresaTop.enUlt[0]!.v) }
  : empresaTop.max > 0
    ? {
      label: "Empresa con mayor turnover",
      value: listaY(empresaTop.top.map((t) => t.e)),
      detail: `${fmtPctC(empresaTop.max)} en ${listaY(empresaTop.top.map((t) => t.anio))} · en ${anio} ninguna registra rotación`,
    }
    : { label: "Empresa con mayor turnover", value: "—", detail: "Ninguna empresa registra rotación" };

const calloutRotacion: Linea = (() => {
  const conMeta = anualConDato.filter((r) => r.metaTurnover != null);
  const sobre = conMeta.filter((r) => (r.turnover ?? 0) > (r.metaTurnover ?? 0));
  const periodo = `${anualConDato[0]?.anio} – ${anualConDato[anualConDato.length - 1]?.anio}`;
  const t = rot.turnover, m = rot.metaTurnover;
  const cierre = t != null && m != null ? `, y cierra ${anio} en ${b(par(t, m)[0])} (${relacion(t, m)} la meta de ${par(t, m)[1]})` : "";
  const dentro = t != null && m != null && t <= m;
  return sobre.length === 0
    ? { tono: "ok", html: `En ${periodo} el turnover se mantuvo dentro de la meta${cierre}.` }
    : { tono: dentro ? "ok" : "alerta", html: `En ${periodo} el turnover superó la meta en ${sobre.length} de ${conMeta.length} años (${listaY(sobre.map((r) => String(r.anio)))})${cierre}.` };
})();

export const rotacion = (() => {
  const t = rot.turnover, m = rot.metaTurnover;
  const est = estadoMeta(t, m);
  const kpisRot: Kpi[] = [
    { label: `Turnover ${anio}`, value: t != null && m != null ? par(t, m)[0] : fmtPctC(t), detail: `Meta ${anio}: ${m != null && t != null ? par(t, m)[1] : fmtPctC(m)}`, ...est },
    { label: `NH Turnover ${anio}`, value: fmtPctC(rot.nhTurnover), detail: `Meta ${anio}: ${fmtPctC(rot.metaNH)}`, ...estadoMeta(rot.nhTurnover, rot.metaNH) },
    { label: `Ceses ${CD_NOMBRE} ${anio}`, value: fmtNum(cesesAnio), detail: rangoRot },
    rotKpiEmpresa,
  ];
  const hallazgos: Linea[] = [calloutRotacion];
  if (t != null && rotPrev?.turnover != null) {
    const d = t - rotPrev.turnover;
    hallazgos.push({
      tono: d <= 0 ? "ok" : "alerta",
      html: d === 0 ? `El turnover ${anio} es igual al de ${anio - 1} (${fmtPctC(t)}).`
        : `Frente a ${anio - 1} (${fmtPctC(rotPrev.turnover)}), el turnover ${d < 0 ? "baja" : "sube"} ${b(fmtPP(d))}.`,
    });
  }
  hallazgos.push({
    tono: "ok",
    html: cesesAnio === 0 ? `No se registraron ceses en ${CD_NOMBRE} en el periodo ${rangoRot}.` : `Se registraron ${b(plural(cesesAnio, "cese"))} en ${CD_NOMBRE} en el periodo ${rangoRot}.`,
  });
  if (empresaTop.max > 0) {
    hallazgos.push({
      tono: empresaTop.enUlt.length ? "alerta" : "ok",
      html: `El mayor turnover por empresa fue ${b(listaY(empresaTop.top.map((x) => `${x.e} (${x.anio})`)))} con ${fmtPctC(empresaTop.max)}; `
        + (empresaTop.enUlt.length ? `en ${anio} registran rotación ${listaY(empresaTop.enUlt.map((x) => x.e))}.` : `en ${anio} ninguna empresa registra rotación.`),
    });
  }
  const conMeta = anualConDato.filter((r) => r.metaTurnover != null);
  const sobre = conMeta.filter((r) => (r.turnover ?? 0) > (r.metaTurnover ?? 0)).length;
  const frase = t == null ? "Sin turnover registrado."
    : `${est.status === "ok" ? "Dentro" : "Por encima"} de la meta en ${anio}. `
      + (sobre === 0 ? `Se mantuvo dentro de la meta todos los años desde ${anualConDato[0]?.anio}.`
        : `Superó la meta en ${sobre} de ${conMeta.length} años desde ${anualConDato[0]?.anio}.`)
      + ` ${cesesAnio === 0 ? "Sin ceses" : plural(cesesAnio, "cese")} en ${rangoRot}.`;
  return {
    anio, turnover: t, meta: m, ...est, kpis: kpisRot, hallazgos, frase,
    sparkCats: resumenRotacion.map((r) => String(r.anio)),
    sparkValores: resumenRotacion.map((r) => r.turnover), sparkMetas: resumenRotacion.map((r) => r.metaTurnover),
  };
})();

// =====================================================================
// AUSENTISMO
// =====================================================================
export const ausentismo = (() => {
  const a = kpis.ausentismoAnio;
  const aus = resumenAusentismo.find((r) => r.anio === a);
  const ausPrev = resumenAusentismo.find((r) => r.anio === a - 1);
  const meses = ausentismoMensual.filter((m) => m.anio === a && m.conDato);
  const rango = meses.length ? `${meses[0]!.label} – ${meses[meses.length - 1]!.label}` : String(a);
  const diasEmp = diasAusentesPorEmpresa[String(a)] ?? [];
  const diasAnio = diasEmp.reduce((s, x) => s + x.dias, 0);
  const sobreMeta = meses.filter((m) => m.pct != null && m.meta != null && m.pct > m.meta);
  const est = estadoMeta(aus?.pct ?? null, aus?.meta ?? null);
  const [vs, ms] = aus?.pct != null && aus.meta != null ? par(aus.pct, aus.meta) : [fmtPctC(aus?.pct), fmtPctC(aus?.meta)];

  const kpisAus: Kpi[] = [
    { label: `Ausentismo ${a}`, value: vs, detail: `Meta ${a}: ${ms}`, ...est },
    { label: `Días ausentes ${a}`, value: fmtNum(diasAnio), detail: rango },
    diasEmp[0] && diasEmp[0].dias > 0
      ? { label: `Empresa con más días ausentes ${a}`, value: diasEmp[0].empresa, detail: plural(diasEmp[0].dias, "día") }
      : { label: `Empresa con más días ausentes ${a}`, value: "—", detail: "Sin días ausentes" },
    { label: `Meses sobre la meta ${a}`, value: `${sobreMeta.length} de ${meses.length}`, detail: "Ausentismo mensual vs meta mensual" },
  ];

  const hallazgos: Linea[] = [];
  if (aus?.pct != null && aus.meta != null) {
    hallazgos.push({ tono: aus.pct <= aus.meta ? "ok" : "alerta", html: `El ausentismo ${a} es ${b(vs)}, ${relacion(aus.pct, aus.meta)} la meta de ${ms}.` });
  }
  if (aus?.pct != null && ausPrev?.pct != null) {
    const d = aus.pct - ausPrev.pct;
    hallazgos.push({
      tono: d <= 0 ? "ok" : "alerta",
      html: d === 0 ? `Igual que en ${a - 1} (${fmtPctC(ausPrev.pct)}).` : `Frente a ${a - 1} (${fmtPctC(ausPrev.pct)}), ${d < 0 ? "baja" : "sube"} ${b(fmtPP(d))}.`,
    });
  }
  hallazgos.push({
    tono: sobreMeta.length === 0 ? "ok" : "alerta",
    html: sobreMeta.length === 0
      ? `Ningún mes de ${a} superó la meta mensual.`
      : `${plural(sobreMeta.length, "mes", "meses")} de ${a} ${sobreMeta.length === 1 ? "superó" : "superaron"} la meta mensual (${listaY(sobreMeta.map((m) => m.label))}).`,
  });
  const todos = diasAusentesPorEmpresa[""] ?? [];
  if (todos[0] && todos[0].dias > 0) {
    const total = todos.reduce((s, x) => s + x.dias, 0);
    hallazgos.push({ tono: "ok", html: `En todo el periodo, ${b(todos[0].empresa)} concentra ${plural(todos[0].dias, "día")} de ${fmtNum(total)} días ausentes (${fmtPctC(todos[0].dias / total, 0)}).` });
  }

  const ultimos = ausentismoMensual.filter((m) => m.conDato).slice(-12);
  const frase = aus?.pct != null && aus.meta != null
    ? `${est.status === "ok" ? "Dentro de" : "Por encima de"} la meta en ${a}: ${plural(diasAnio, "día ausente", "días ausentes")} y ${sobreMeta.length} de ${meses.length} meses sobre la meta mensual.`
    : `${plural(diasAnio, "día ausente", "días ausentes")} en ${a}.`;
  return {
    anio: a, valor: vs, meta: ms, ...est, kpis: kpisAus, hallazgos, frase,
    sparkCats: ultimos.map((m) => m.label), sparkValores: ultimos.map((m) => m.pct), sparkMetas: ultimos.map((m) => m.meta),
  };
})();

// =====================================================================
// HEADCOUNT Y CESES
// =====================================================================
export const headcount = (() => {
  const conDato = hcCallaoMensual.filter((m) => m.hc != null);
  const ult = conDato[conDato.length - 1];
  const mismoMesPrev = ult ? hcCallaoMensual.find((m) => m.mes === `${ult.anio - 1}${ult.mes.slice(4)}`) : undefined;
  const voluntarios = cesesResumen.porClase.find((c) => c.nombre === "Voluntario")?.valor ?? 0;
  const pctVol = cesesResumen.total ? voluntarios / cesesResumen.total : null;

  const kpisHc: Kpi[] = [
    {
      label: `Headcount ${CD_NOMBRE}`, value: fmtNum(ult?.hc ?? null),
      detail: ult ? `${ult.label}${mismoMesPrev?.hc != null && ult.hc != null ? ` · ${ult.hc - mismoMesPrev.hc >= 0 ? "+" : "−"}${fmtNum(Math.abs(ult.hc - mismoMesPrev.hc))} vs ${mismoMesPrev.label}` : ""}` : undefined,
    },
    { label: "Headcount nacional", value: fmtNum(kpis.hcNacional), detail: `${kpis.hcNacionalMes} · hoja Headcount` },
    { label: "Ceses (todos los CD)", value: fmtNum(cesesResumen.total), detail: `${plural(cesesResumen.turnoverSi, "computa", "computan")} para turnover` },
    { label: "Ceses voluntarios", value: fmtPctC(pctVol), detail: `${fmtNum(voluntarios)} de ${fmtNum(cesesResumen.total)}` },
  ];

  const ranking = [...hcPorCD.filas].sort((x, y) => (y.valor ?? 0) - (x.valor ?? 0));
  const pos = ranking.findIndex((f) => f.cd === CD_NOMBRE);
  const motivoTop = cesesResumen.porMotivo[0];
  const meses = cesesPorMesClase.meses.map((m, i) => ({ m, n: (cesesPorMesClase.voluntario[i] ?? 0) + (cesesPorMesClase.involuntario[i] ?? 0) }));
  const mesTop = [...meses].sort((x, y) => y.n - x.n)[0];

  const hallazgos: Linea[] = [];
  if (pos >= 0) {
    hallazgos.push({ tono: "ok", html: `${CD_NOMBRE} es el ${b(`n.º ${pos + 1}`)} de ${ranking.length} CD por headcount T2 en ${hcPorCD.mes} (${plural(ranking[pos]!.valor ?? 0, "persona")}).` });
  }
  if (motivoTop) {
    hallazgos.push({
      tono: "ok",
      html: `${b(motivoTop.nombre)} explica ${fmtNum(motivoTop.valor)} de ${fmtNum(cesesResumen.total)} ceses (${fmtPctC(motivoTop.valor / cesesResumen.total, 0)}).`,
    });
  }
  if (mesTop && mesTop.n > 0) {
    const nombre = MESES_LARGOS.find((x) => x.startsWith(mesTop.m)) ?? mesTop.m;
    hallazgos.push({ tono: "ok", html: `${b(nombre.charAt(0).toUpperCase() + nombre.slice(1))} concentra el mayor número de ceses (${fmtNum(mesTop.n)} de ${fmtNum(cesesResumen.total)}).` });
  }
  if (pctVol != null) {
    hallazgos.push({ tono: pctVol <= 0.5 ? "ok" : "alerta", html: `Los ceses voluntarios son el ${b(fmtPctC(pctVol))} del total; el resto son involuntarios.` });
  }

  const frase = ult?.hc != null
    ? `${fmtNum(ult.hc)} personas en ${CD_NOMBRE} a ${ult.label}. A nivel nacional, ${fmtNum(cesesResumen.total)} ceses (${fmtPctC(pctVol)} voluntarios).`
    : `${fmtNum(cesesResumen.total)} ceses a nivel nacional.`;
  const spark = conDato.slice(-12);
  return {
    hc: ult?.hc ?? null, mes: ult?.label ?? "", kpis: kpisHc, hallazgos, frase, pctVol,
    sparkCats: spark.map((m) => m.label), sparkValores: spark.map((m) => m.hc),
    hcNacionalMeses: headcountMensual.meses,
  };
})();

// =====================================================================
// PLANES DE ACCIÓN
// =====================================================================
const HOY = new Date().toISOString().slice(0, 10);
export const planes = (() => {
  const total = accionesResumen.total;
  const completadas = accionesResumen.completadas;
  const enCurso = acciones.filter((a) => a.estado === "En curso").length;
  const pendientes = acciones.filter((a) => a.estado === "Pendiente").length;
  const abiertas = acciones.filter((a) => a.estado !== "Completado")
    .sort((x, y) => (x.fechaSolucion ?? "9999").localeCompare(y.fechaSolucion ?? "9999"));
  const vencidas = abiertas.filter((a) => a.fechaSolucion != null && a.fechaSolucion < HOY);
  const pct = total ? completadas / total : null;

  const kpisPlan: Kpi[] = [
    { label: "Acciones completadas", value: fmtPctC(pct, 0), detail: `${fmtNum(completadas)} de ${fmtNum(total)}`, status: pct === 1 ? "ok" : "neutral", statusText: pct === 1 ? "Todas completadas" : "En avance" },
    { label: "En curso", value: fmtNum(enCurso) },
    { label: "Pendientes", value: fmtNum(pendientes) },
    {
      label: "Próxima fecha de solución", value: abiertas[0] ? fmtFecha(abiertas[0].fechaSolucion) : "—",
      detail: vencidas.length ? `${plural(vencidas.length, "acción abierta vencida", "acciones abiertas vencidas")}` : abiertas.length ? "Sin acciones vencidas" : "No hay acciones abiertas",
      status: vencidas.length ? "alerta" : undefined, statusText: vencidas.length ? "Vencida" : undefined,
    },
  ];

  const porTema = new Map<string, number>();
  acciones.forEach((a) => porTema.set(a.tema, (porTema.get(a.tema) ?? 0) + 1));
  const ultCompletada = acciones.find((a) => a.estado === "Completado");
  const hallazgos: Linea[] = [
    { tono: "ok", html: `${b(`${fmtNum(completadas)} de ${fmtNum(total)}`)} acciones están completadas (${fmtPctC(pct, 0)}).` },
  ];
  if (vencidas.length) {
    hallazgos.push({
      tono: "alerta",
      html: `${plural(vencidas.length, "acción abierta tiene", "acciones abiertas tienen")} la fecha de solución vencida (${listaY(vencidas.map((v) => fmtFecha(v.fechaSolucion)))}).`,
    });
  }
  hallazgos.push({ tono: "ok", html: `Por tema: ${listaY([...porTema].map(([t, n]) => `${t} ${b(fmtNum(n))}`))}.` });
  if (ultCompletada) hallazgos.push({ tono: "ok", html: `Última completada (iniciada ${fmtFecha(ultCompletada.fecha)}): «${ultCompletada.plan}».` });

  const frase = `${fmtNum(completadas)} de ${fmtNum(total)} acciones completadas; ${plural(enCurso, "en curso", "en curso")} y ${plural(pendientes, "pendiente")}${vencidas.length ? `, ${plural(vencidas.length, "vencida")}` : ""}.`;
  return { total, completadas, enCurso, pendientes, pct, vencidas: vencidas.length, kpis: kpisPlan, hallazgos, frase, abiertas };
})();

// =====================================================================
// CONCLUSIÓN GENERAL
// =====================================================================
export const dentroMetaTurnover = rotacion.status === "ok";
export const conclusion = (() => {
  const t = rot.turnover, m = rot.metaTurnover;
  const s1 = t != null && m != null
    ? `En ${anio}, el turnover de ${CD_NOMBRE} (${b(par(t, m)[0])}) está ${relacion(t, m)} la meta (${par(t, m)[1]}) y el ausentismo ${ausentismo.anio} (${b(ausentismo.valor)}) está ${ausentismo.status === "ok" ? "dentro de" : "por encima de"} su meta (${ausentismo.meta}).`
    : `El ausentismo ${ausentismo.anio} es ${b(ausentismo.valor)} frente a una meta de ${ausentismo.meta}.`;
  const s2 = `El CD cuenta con ${b(fmtNum(headcount.hc))} personas a ${headcount.mes}, ${cesesAnio === 0 ? "sin ceses" : `con ${plural(cesesAnio, "cese")}`} en ${anio}; a nivel nacional hay ${fmtNum(cesesResumen.total)} ceses (${fmtPctC(headcount.pctVol)} voluntarios).`;
  const s3 = `Del plan de acción, ${b(`${fmtNum(planes.completadas)} de ${fmtNum(planes.total)}`)} acciones están completadas${planes.vencidas ? ` y ${plural(planes.vencidas, "abierta está vencida", "abiertas están vencidas")}` : ""}.`;
  return {
    texto: `${s1} ${s2} ${s3}`,
    frase: dentroMetaTurnover ? fraseConclusionPositiva(anio) : fraseConclusionNeutra(anio),
    positiva: dentroMetaTurnover,
  };
})();
