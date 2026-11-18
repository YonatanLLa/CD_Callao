import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
// Uso: bun scripts/extract-excel.ts <archivo.xlsx> [salida.json]
const [src, out = "datos/gkpi_ausentismo_rotacion_callao.json"] = process.argv.slice(2);
if (!src) { console.error("Uso: bun scripts/extract-excel.ts <archivo.xlsx> [salida.json]"); process.exit(1); }
const wb = XLSX.readFile(src);
const S = (n: string) => wb.Sheets[n];
const cell = (ws: XLSX.WorkSheet, a: string) => { const c = ws[a]; if (!c || c.v == null) return null; const v = c.v; if (typeof v === "string") { const t = v.trim(); return t === "" || t === "-" ? null : t; } return v; };
const iso = (serial: any) => { if (typeof serial !== "number") return serial ?? null; const d = XLSX.SSF.parse_date_code(serial); return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`; };
const ym = (serial: number) => iso(serial).slice(0, 7);
const dmy = (s: any) => typeof s === "string" && /^\d{2}\.\d{2}\.\d{4}$/.test(s) ? s.split(".").reverse().join("-") : s;
const num = (v: any) => typeof v === "number" ? +v.toFixed(6) : v === "NA" ? null : v;
const col = XLSX.utils.decode_col, ec = XLSX.utils.encode_col;
const at = (ws: XLSX.WorkSheet, c: string | number, r: number) => cell(ws, (typeof c === "number" ? ec(c) : c) + r);

// 1. PLAN DE ACCIÓN
const pa = S("PLAN DE ACCIÓN"); const paRows = XLSX.utils.sheet_to_json<any[]>(pa, { header: 1, defval: null, blankrows: false, raw: true });
const meses = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SETIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
const historico: Record<string, any[]> = {}; let cur: string | null = null; const planAccion: any[] = []; let inPlan = false;
for (const r of paRows) {
  if (r[2] === "ENERO") { cur = r[1]; historico[cur!] = []; continue; }
  if (r[0] === "Fecha") { inPlan = true; cur = null; continue; }
  if (inPlan) { planAccion.push({ fecha: dmy(r[0]), tema: r[1], planDeAccion: r[2]?.trim(), comentario: r[10], responsable: r[11]?.trim(), fechaSolucion: dmy(r[12]), estado: r[13] }); continue; }
  if (cur && typeof r[1] === "number") { const o: any = { anio: r[1] }; meses.forEach((m, i) => o[m.toLowerCase()] = num(r[i + 2])); historico[cur].push(o); }
}

// 2. CESES / HC (tablas planas)
const flat = (n: string, dateCols: string[]) => XLSX.utils.sheet_to_json<any>(S(n), { defval: null, raw: true }).map(o => {
  const r: any = {}; for (const [k, v] of Object.entries(o)) { const key = k.trim(); r[key] = dateCols.includes(key) ? iso(v) : typeof v === "string" ? v.trim() || null : v; } return r; });
const ceses = flat("CESES", ["FECHA INICIO"]);
const hc = flat("HC", ["Fecha ingreso"]);

// 3. TD HC (tablas dinámicas → formato largo)
const tdhc = S("TD HC"); const mesesTD = ["Enero","Febrero","Marzo","Abril","Mayo"];
const pivot = (c0: number, r0: number) => { const rows: any[] = []; for (let r = r0; ; r++) { const cd = at(tdhc, c0, r); if (!cd || cd === "Total general") break; const o: any = { cd }; mesesTD.forEach((m, i) => o[m.toLowerCase()] = at(tdhc, c0 + 1 + i, r)); o.total = at(tdhc, c0 + 6, r); rows.push(o); } return rows; };
const tdHC = { filtro: { "T1/T2": "T2" }, headcountPorCD: pivot(0, 5), newHirePorCD: { filtro: { "T1/T2": "T2", "NEW HIRE": "SÍ" }, datos: pivot(10, 6) } };

// 4. TD CESES
const tdc = S("TD CESES");
const tdCeses = { filtro: { TO: "SÍ" }, cesesPorCD: [] as any[], nhtoPorCD: [] as any[] };
const tdcCols: [string, string, number][] = [["febrero","NO",1],["marzo","NO",3],["marzo","SÍ",4],["mayo","SÍ",6]];
for (let r = 5; ; r++) { const cd = at(tdc, "A", r); if (!cd || cd === "Total general") break;
  for (const [mes, nhto, c] of tdcCols) { const v = at(tdc, c, r); if (typeof v === "number") tdCeses.cesesPorCD.push({ cd, mes, newHire: nhto, ceses: v }); } }
for (let r = 5; ; r++) { const cd = at(tdc, "L", r); if (!cd || cd === "Total general") break; tdCeses.nhtoPorCD.push({ cd, mes: "marzo", ceses: at(tdc, "M", r) }); }

// 5. CONSOLIDADO ROTACION
const cr = S("CONSOLIDADO ROTACION");
const empR = ["C","I","O","U","AA","AG","AM"].map(c => ({ c: col(c), nombre: at(cr, c, 5) as string }));
const rotacionMensual: any[] = [];
for (let r = 8; r <= 55; r++) { const f = at(cr, "B", r); if (typeof f !== "number") continue;
  const empresas: any = {};
  for (const e of empR) { const g = (o: number) => num(at(cr, e.c + o, r));
    empresas[e.nombre] = { turnover: { ceses: g(0), hc: g(1), pct: g(2) }, newHireTurnover: { ceses: g(3), hc: g(4), pct: g(5) } }; }
  rotacionMensual.push({ mes: ym(f), empresas, cdCallao: { turnoverPct: num(at(cr, "AV", r)), nhTurnoverPct: num(at(cr, "AW", r)), metaCD: num(at(cr, "AX", r)), nhToCD: num(at(cr, "AY", r)) } }); }
const rotAnual: any[] = []; for (let r = 33; r <= 36; r++) rotAnual.push({ anio: at(cr, "BA", r), turnoverPct: num(at(cr, "BB", r)), turnoverMetaCD: num(at(cr, "BC", r)), nhTurnoverPct: num(at(cr, "BE", r)), nhTurnoverMetaCD: num(at(cr, "BF", r)) });
const byEmp = (c0: string) => { const rows: any[] = []; for (let r = 33; r <= 40; r++) { const o: any = { empresa: at(cr, c0, r) }; [2023,2024,2025,2026].forEach((y, i) => o[y] = num(at(cr, col(c0) + 1 + i, r))); rows.push(o); } return rows; };

// 6. CONSOLIDADO AUSENTISMO
const ca = S("CONSOLIDADO AUSENTISMO");
const empA = [["BACKUS","B"],["T77","E"],["FORMAVENA","H"],["ROSALES","K"],["ATLAS","N"],["ADRIANCAR","Q"],["LOGITRAK","T"]] as const;
const ausMensual: any[] = [];
for (let r = 2; r <= 49; r++) { const f = at(ca, "A", r); if (typeof f !== "number") continue; const empresas: any = {};
  for (const [n, c] of empA) { const i = col(c); empresas[n] = { diasAusentes: num(at(ca, i, r)), diasTrabajados: num(at(ca, i + 1, r)), pct: num(at(ca, i + 2, r)) }; }
  ausMensual.push({ mes: ym(f), empresas, ausentismoPct: num(at(ca, "X", r)), metaCD: num(at(ca, "Y", r)) }); }
const ausAnual: any[] = [], ausEmp: any[] = []; const empHdr = ["AL","AM","AN","AO","AP","AQ","AR"].map(c => at(ca, c, 44) as string);
for (let r = 45; r <= 48; r++) { ausAnual.push({ anio: at(ca, "AB", r), ausentismoPctCDRimac: num(at(ca, "AC", r)), metaCD: num(at(ca, "AD", r)) });
  const o: any = { anio: at(ca, "AK", r) }; empHdr.forEach((e, i) => o[e] = num(at(ca, col("AL") + i, r))); o.metaPct = num(at(ca, "AS", r)); ausEmp.push(o); }

// 7. Acciones
// Columnas localizadas por encabezado (fila 2) para tolerar columnas nuevas o reordenadas.
const ac = S("Acciones"); const acciones: any[] = [];
const norm = (s: any) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
const acRange = XLSX.utils.decode_range(ac["!ref"]!); const acHdr: Record<string, number> = {};
for (let c = acRange.s.c; c <= acRange.e.c; c++) { const h = norm(at(ac, c, 2)); if (h) acHdr[h] = c; }
const acCol = (h: string, fallback: string | null) => acHdr[h] ?? (fallback ? col(fallback) : null);
const cF = acCol("fecha", "B")!, cT = acCol("tema", "C")!, cP = acCol("plan de accion", "D")!, cC = acCol("comentario", null),
  cR = acCol("responsable", "E")!, cS = acCol("fecha de solucion", "F")!, cE = acCol("estado", "G")!;
for (let r = 3; ; r++) { if (at(ac, cF, r) == null) break;
  acciones.push({ fecha: iso(at(ac, cF, r)), tema: at(ac, cT, r), planDeAccion: at(ac, cP, r), ...(cC != null ? { comentario: at(ac, cC, r) } : {}),
    responsable: at(ac, cR, r), fechaSolucion: iso(at(ac, cS, r)), estado: at(ac, cE, r) }); }

const result = {
  fuente: process.env.FUENTE ?? src.split(/[\\/]/).pop(), nota: "Porcentajes como decimal (0.05 = 5%). Fechas ISO (YYYY-MM-DD / YYYY-MM). null = vacío o '-'/'NA' en el Excel.",
  planDeAccion: { historicoMensual: historico, acciones: planAccion },
  ceses, headcount: hc, tablaDinamicaHC: tdHC, tablaDinamicaCeses: tdCeses,
  consolidadoRotacion: { mensual: rotacionMensual, resumenAnualCD: rotAnual, turnoverPorEmpresa: byEmp("BH"), nhTurnoverPorEmpresa: byEmp("BN") },
  consolidadoAusentismo: { mensual: ausMensual, resumenAnualCD: ausAnual, porEmpresa: ausEmp },
  acciones,
};
mkdirSync(out.replace(/[\/][^\/]+$/, ""), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 2));
console.log("ceses", ceses.length, "hc", hc.length, "rotMes", rotacionMensual.length, "ausMes", ausMensual.length, "acciones", acciones.length, "plan", planAccion.length, Object.keys(historico));
