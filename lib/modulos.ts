// Catálogo de herramientas (módulos) que el dueño puede prender/apagar por tienda.

export type ClaveModulo =
  | "colecciones"
  | "importar"
  | "inventario"
  | "pos"
  | "ventas"
  | "corte"
  | "promociones"
  | "marcas"
  | "iaInventario"
  | "iaFondoBlanco"
  | "iaEmparejarFotos"
  | "iaBusqueda"
  | "iaAnalista"
  | "iaContenido";

export type Modulos = Record<ClaveModulo, boolean>;

export const MODULOS: {
  clave: ClaveModulo;
  etiqueta: string;
  descripcion: string;
  porDefecto: boolean;
}[] = [
  {
    clave: "colecciones",
    etiqueta: "Colecciones",
    descripcion: "Agrupar productos por categoría en el catálogo.",
    porDefecto: true,
  },
  {
    clave: "importar",
    etiqueta: "Importar catálogo",
    descripcion: "Cargar muchos productos desde un CSV.",
    porDefecto: true,
  },
  {
    clave: "inventario",
    etiqueta: "Inventario",
    descripcion: "Control de stock y movimientos.",
    porDefecto: true,
  },
  {
    clave: "pos",
    etiqueta: "Punto de venta",
    descripcion: "Cobrar en mostrador.",
    porDefecto: true,
  },
  {
    clave: "ventas",
    etiqueta: "Ventas",
    descripcion: "Historial de ventas.",
    porDefecto: true,
  },
  {
    clave: "corte",
    etiqueta: "Corte de caja",
    descripcion: "Cierre del día por método de pago.",
    porDefecto: true,
  },
  {
    clave: "promociones",
    etiqueta: "Promociones",
    descripcion:
      "Descuentos por colección, marca o toda la tienda, con fechas.",
    porDefecto: true,
  },
  {
    clave: "marcas",
    etiqueta: "Catálogo por marca",
    descripcion:
      "El cliente navega Categoría → Marca → Producto en el catálogo público.",
    porDefecto: false,
  },
  {
    clave: "iaInventario",
    etiqueta: "IA: foto a inventario",
    descripcion:
      "Sube una foto de tu lista y la IA la convierte en productos para importar.",
    porDefecto: false,
  },
  {
    clave: "iaFondoBlanco",
    etiqueta: "IA: fondo blanco en fotos",
    descripcion:
      "A cada foto de producto que subas se le pone fondo blanco automáticamente.",
    porDefecto: false,
  },
  {
    clave: "iaEmparejarFotos",
    etiqueta: "IA: emparejar fotos en lote",
    descripcion:
      "Sube muchas fotos de golpe y la IA las asigna al producto correcto.",
    porDefecto: false,
  },
  {
    clave: "iaBusqueda",
    etiqueta: "IA: búsqueda inteligente",
    descripcion:
      "En el catálogo, el cliente busca en lenguaje natural (ej. 'gorra negra menos de $1500').",
    porDefecto: false,
  },
  {
    clave: "iaAnalista",
    etiqueta: "IA: asistente del dueño",
    descripcion:
      "Chat para preguntar sobre tus ventas e inventario con datos reales.",
    porDefecto: false,
  },
  {
    clave: "iaContenido",
    etiqueta: "IA: generador de contenido",
    descripcion:
      "Genera descripciones de producto y posts para redes con un clic.",
    porDefecto: false,
  },
];

// Convierte el Json guardado (o null) en un objeto completo con todas las claves.
export function normalizarModulos(valor: unknown): Modulos {
  const base = {} as Modulos;
  for (const m of MODULOS) base[m.clave] = m.porDefecto;
  if (valor && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    for (const m of MODULOS) {
      if (typeof obj[m.clave] === "boolean") base[m.clave] = obj[m.clave] as boolean;
    }
  }
  return base;
}
