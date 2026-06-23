// Catálogo de herramientas (módulos) que el dueño puede prender/apagar por tienda.

export type ClaveModulo =
  | "colecciones"
  | "importar"
  | "inventario"
  | "pos"
  | "ventas"
  | "corte"
  | "clientes"
  | "tandas"
  | "sets"
  | "marcas";

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
    clave: "clientes",
    etiqueta: "Clientes y fiado",
    descripcion: "Clientes, deudas y abonos.",
    porDefecto: false,
  },
  {
    clave: "tandas",
    etiqueta: "Tandas",
    descripcion: "Cundinas rotativas con entrega de producto.",
    porDefecto: false,
  },
  {
    clave: "sets",
    etiqueta: "Sets",
    descripcion: "Paquetes/kits de varias presentaciones.",
    porDefecto: false,
  },
  {
    clave: "marcas",
    etiqueta: "Catálogo por marca",
    descripcion:
      "El cliente navega Categoría → Marca → Producto en el catálogo público.",
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
