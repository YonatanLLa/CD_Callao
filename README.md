# Dashboard GKPI · Ausentismo y Rotación – CD Callao

Dashboard estático (Astro + Tailwind CSS + Apache ECharts) con los indicadores de
rotación (turnover / NH turnover), ausentismo, headcount, ceses y planes de acción
del CD Callao.

## Requisitos

- [Bun](https://bun.sh) 1.3 o superior

## Uso

```bash
bun install          # instalar dependencias
bun run dev          # servidor de desarrollo en http://localhost:4321
bun run build        # generar el sitio estático en dist/
bun run preview      # previsualizar el build
bunx astro check     # verificación de tipos
```

## Actualizar los datos

Los datos salen de `datos/gkpi_ausentismo_rotacion_callao.json`, generado a partir del Excel:

```bash
bun run extract "<ruta.xlsx>"
```

Luego vuelve a ejecutar `bun run build`. Toda la agregación ocurre en tiempo de build
(`src/lib/data.ts`); al navegador sólo llegan las series agregadas.

## Estructura

- `src/pages/` — Resumen, Rotación, Ausentismo, Headcount y Acciones
- `src/lib/data.ts` — lectura y agregación del JSON
- `src/lib/charts.ts` — constructores de opciones de ECharts
- `src/lib/format.ts` — formatos es-PE (porcentajes, meses «ene 2023», fechas)
- `src/lib/colors.ts` — color fijo por empresa
- `src/components/Chart.astro` — tarjeta de gráfico con descarga PNG
- `scripts/extract-excel.ts` — extractor Excel → JSON
