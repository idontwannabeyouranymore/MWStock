// Personalización del catálogo público por tienda. Se guarda como JSON en
// Tienda.personalizacion. Con los valores por defecto, el catálogo se ve igual
// que antes (no rompe nada).

import type { ConfigEstilo } from "@/lib/estilos-catalogo";

export type Personalizacion = {
  modo: "oscuro" | "claro";
  colorFondo: string; // hex; "" = usar el del modo
  fuente: "moderna" | "elegante" | "redondeada" | "tecnica";
  esquinas: "redondeadas" | "suaves" | "rectas";
  columnas: "compacto" | "normal" | "amplio";
  titulo: string; // "" = usar el nombre de la tienda
  subtitulo: string; // "" = usar la descripción
  mostrarBanner: boolean;
  mostrarLogo: boolean;
  mostrarBadges: boolean;
  mostrarEmojis: boolean;
  mostrarPrecios: boolean;
  ocultarAgotados: boolean;
};

export const PERSONALIZACION_DEFAULT: Personalizacion = {
  modo: "oscuro",
  colorFondo: "",
  fuente: "moderna",
  esquinas: "redondeadas",
  columnas: "normal",
  titulo: "",
  subtitulo: "",
  mostrarBanner: true,
  mostrarLogo: true,
  mostrarBadges: true,
  mostrarEmojis: true,
  mostrarPrecios: true,
  ocultarAgotados: false,
};

export function normalizarPersonalizacion(valor: unknown): Personalizacion {
  const base = { ...PERSONALIZACION_DEFAULT };
  if (valor && typeof valor === "object") {
    const o = valor as Record<string, unknown>;
    for (const k of Object.keys(base) as (keyof Personalizacion)[]) {
      const v = o[k];
      if (v !== undefined && v !== null && typeof v === typeof base[k]) {
        // @ts-expect-error asignación dinámica validada por tipo
        base[k] = v;
      }
    }
  }
  return base;
}

export const FUENTES: Record<Personalizacion["fuente"], string> = {
  moderna:
    "ui-sans-serif, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  elegante: "Georgia, 'Times New Roman', Times, serif",
  redondeada: "'Trebuchet MS', 'Segoe UI', Verdana, sans-serif",
  tecnica: "ui-monospace, 'Courier New', monospace",
};

const RADIO: Record<Personalizacion["esquinas"], string> = {
  redondeadas: "rounded-2xl",
  suaves: "rounded-lg",
  rectas: "rounded-none",
};

const GRID: Record<Personalizacion["columnas"], string> = {
  compacto: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  normal: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  amplio: "grid-cols-1 sm:grid-cols-2",
};

// Objeto que consumen las páginas del catálogo. Mantiene los campos del
// ConfigEstilo (emojis, badges, tarjeta, imagenHover, cardHover) para que las
// páginas sigan usando `estilo.*` sin cambios, y agrega los nuevos.
export type TemaCatalogo = {
  emojis: boolean;
  badges: boolean;
  tarjeta: string;
  imagenHover: string;
  cardHover: string;
  gridClass: string;
  mainStyle: {
    backgroundColor: string;
    color: string;
    fontFamily: string;
  };
  textoTenue: string;
  claro: boolean;
  mostrarPrecios: boolean;
  ocultarAgotados: boolean;
  titulo: string;
  subtitulo: string;
  mostrarBanner: boolean;
  mostrarLogo: boolean;
};

export function temaCatalogo(
  per: Personalizacion,
  base: ConfigEstilo
): TemaCatalogo {
  const claro = per.modo === "claro";
  const bg = per.colorFondo.trim() || (claro ? "#f6f7f9" : "#0a0a0a");
  const color = claro ? "#111827" : "#ffffff";
  const cardBg = claro
    ? "bg-white border border-neutral-200 shadow-sm"
    : "bg-neutral-900 border border-neutral-800";
  return {
    emojis: base.emojis && per.mostrarEmojis,
    badges: base.badges && per.mostrarBadges,
    tarjeta: `${RADIO[per.esquinas]} ${cardBg}`,
    imagenHover: base.imagenHover,
    cardHover: base.cardHover,
    gridClass: GRID[per.columnas],
    mainStyle: {
      backgroundColor: bg,
      color,
      fontFamily: FUENTES[per.fuente],
    },
    textoTenue: claro ? "text-neutral-600" : "text-neutral-400",
    claro,
    mostrarPrecios: per.mostrarPrecios,
    ocultarAgotados: per.ocultarAgotados,
    titulo: per.titulo,
    subtitulo: per.subtitulo,
    mostrarBanner: per.mostrarBanner,
    mostrarLogo: per.mostrarLogo,
  };
}
