// Textos editables de la página Resumen ejecutivo y nombre del CD.
// Todo lo cuantitativo se genera desde los datos (src/lib/resumen.ts); aquí sólo va el texto cualitativo.

/** Nombre del centro de distribución que se muestra en todo el dashboard. */
export const CD_NOMBRE = "CD Callao";

export const TAGLINE = "Comprometidos con nuestra gente, impulsamos resultados sostenibles.";

export const FACTORES_EXITO: string[] = [
  "Procesos de selección alineados al perfil y cultura de la empresa.",
  "Inducción estructurada y acompañamiento temprano.",
  "Liderazgo cercano y comunicación efectiva.",
  "Claridad de rol, objetivos y expectativas.",
  "Cultura: seguridad, ownership y excelencia operacional.",
];

/** Frase destacada de la conclusión cuando el turnover del último año está dentro de la meta. */
export const fraseConclusionPositiva = (anio: number) =>
  `El resultado ${anio} consolida una cultura que atrae, desarrolla y retiene talento.`;

/** Frase destacada cuando el turnover del último año supera la meta. */
export const fraseConclusionNeutra = (anio: number) =>
  `El resultado ${anio} requiere reforzar las acciones de retención.`;

export type IconoPilar = "shield" | "sprout" | "key";
export const PILARES: { icono: IconoPilar; titulo: string; texto: string }[] = [
  { icono: "shield", titulo: "SEGURIDAD", texto: "Es nuestra prioridad" },
  { icono: "sprout", titulo: "DPO", texto: "Desarrollamos personas" },
  { icono: "key", titulo: "DUEÑOS", texto: "De nuestros resultados" },
];

export const SLOGAN = "Cuidamos a nuestra gente porque son nuestro mayor activo y la clave de nuestro éxito.";
