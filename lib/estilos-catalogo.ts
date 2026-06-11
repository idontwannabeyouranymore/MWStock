// Configuración visual del catálogo público según el estilo elegido por la tienda.

export type ConfigEstilo = {
  clave: string;
  nombre: string;
  emojis: boolean;
  badges: boolean;
  glass: boolean;
  tarjeta: string;
  imagenHover: string;
  cardHover: string;
};

export const ESTILOS: { valor: string; nombre: string; descripcion: string }[] = [
  {
    valor: "JUVENIL",
    nombre: "Llamativo y juvenil",
    descripcion: "Colores, emojis, badges y animaciones notorias.",
  },
  {
    valor: "ELEGANTE",
    nombre: "Elegante y minimalista",
    descripcion: "Sutil, mucho espacio, sin emojis.",
  },
  {
    valor: "MODERNO",
    nombre: "Moderno con gradientes",
    descripcion: "Gradientes y efecto vidrio con tu color.",
  },
];

export function configEstilo(estilo: string | null | undefined): ConfigEstilo {
  switch (estilo) {
    case "ELEGANTE":
      return {
        clave: "ELEGANTE",
        nombre: "Elegante",
        emojis: false,
        badges: false,
        glass: false,
        tarjeta: "rounded-xl border border-neutral-800 bg-neutral-900",
        imagenHover: "transition duration-700 ease-out group-hover:scale-105",
        cardHover: "transition duration-300 hover:border-neutral-600",
      };
    case "MODERNO":
      return {
        clave: "MODERNO",
        nombre: "Moderno",
        emojis: false,
        badges: true,
        glass: true,
        tarjeta:
          "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md",
        imagenHover: "transition duration-500 ease-out group-hover:scale-110",
        cardHover: "transition duration-300 hover:-translate-y-1 hover:shadow-2xl",
      };
    case "JUVENIL":
    default:
      return {
        clave: "JUVENIL",
        nombre: "Juvenil",
        emojis: true,
        badges: true,
        glass: false,
        tarjeta: "rounded-2xl border border-neutral-800 bg-neutral-900",
        imagenHover: "transition duration-500 ease-out group-hover:scale-110",
        cardHover:
          "transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40",
      };
  }
}

// ¿El producto es "nuevo"? (creado en los últimos 14 días)
export function esNuevo(fecha: Date | string) {
  const dias =
    (Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24);
  return dias <= 14;
}
