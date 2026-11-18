// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "static",
  vite: {
    plugins: [tailwindcss()],
    // ECharts (core + líneas y barras, tree-shaken) ronda los 540 kB minificado.
    build: { chunkSizeWarningLimit: 700 },
    // Pre-empaqueta juntos los sub-módulos de ECharts para que el servidor de desarrollo
    // no sirva copias de distintas optimizaciones (error "Component grid is used but not imported").
    optimizeDeps: { include: ["echarts/core", "echarts/charts", "echarts/components", "echarts/renderers"] },
  },
});
