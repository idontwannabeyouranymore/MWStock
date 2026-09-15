// Carrito de mayoreo guardado en el navegador (localStorage), por tienda.
// El precio por volumen es POR PRODUCTO: se suma la cantidad de todas las
// tallas de un mismo producto para elegir el nivel.

import { precioMayoreo, type NivelMayoreo } from "@/lib/mayoreo";

export type ItemCarrito = {
  productoId: string;
  nombre: string;
  imagen: string | null;
  varianteId: string;
  talla: string;
  cantidad: number;
  precioBase: number; // base de esa presentación
  niveles: NivelMayoreo[]; // niveles del producto
};

const EVENTO = "mayoreo-carrito-cambio";

function clave(slug: string) {
  return `mayoreo:${slug}`;
}

export function leerCarrito(slug: string): ItemCarrito[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(clave(slug));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function escribir(slug: string, items: ItemCarrito[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(clave(slug), JSON.stringify(items));
    window.dispatchEvent(new Event(EVENTO));
  } catch {
    // localStorage lleno o bloqueado: ignoramos.
  }
}

export function agregarItem(slug: string, item: ItemCarrito) {
  const items = leerCarrito(slug);
  const i = items.findIndex(
    (x) => x.productoId === item.productoId && x.varianteId === item.varianteId
  );
  if (i >= 0) {
    items[i] = { ...items[i], cantidad: items[i].cantidad + item.cantidad };
  } else {
    items.push(item);
  }
  escribir(slug, items);
}

export function actualizarCantidad(
  slug: string,
  varianteId: string,
  cantidad: number
) {
  let items = leerCarrito(slug);
  if (cantidad <= 0) {
    items = items.filter((x) => x.varianteId !== varianteId);
  } else {
    items = items.map((x) =>
      x.varianteId === varianteId ? { ...x, cantidad } : x
    );
  }
  escribir(slug, items);
}

export function quitarItem(slug: string, varianteId: string) {
  escribir(
    slug,
    leerCarrito(slug).filter((x) => x.varianteId !== varianteId)
  );
}

export function limpiarCarrito(slug: string) {
  escribir(slug, []);
}

export function onCarritoCambio(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}

// Total de piezas de un producto en el carrito (para elegir el nivel de precio).
export function piezasDeProducto(items: ItemCarrito[], productoId: string) {
  return items
    .filter((x) => x.productoId === productoId)
    .reduce((s, x) => s + x.cantidad, 0);
}

// Precio unitario de una línea según la cantidad total de ese producto.
export function precioUnitarioLinea(items: ItemCarrito[], item: ItemCarrito) {
  const totalProd = piezasDeProducto(items, item.productoId);
  return precioMayoreo(item.precioBase, item.niveles, totalProd);
}

export function totalCarrito(items: ItemCarrito[]) {
  let piezas = 0;
  let dinero = 0;
  for (const it of items) {
    piezas += it.cantidad;
    dinero += precioUnitarioLinea(items, it) * it.cantidad;
  }
  return { piezas, dinero: Math.round(dinero * 100) / 100 };
}
