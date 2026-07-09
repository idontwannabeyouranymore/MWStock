// Funciones PURAS para promociones (sin prisma) — se pueden usar tanto en el
// servidor como en componentes de cliente (POS, catálogo).

export type Alcance = "TIENDA" | "COLECCION" | "MARCA";

export type PromoActiva = {
  id?: string;
  nombre?: string;
  porcentaje: number;
  alcance: Alcance;
  coleccionId: string | null;
  marca: string | null;
};

// Datos mínimos de un producto para saber si una promo le aplica.
export type ProductoPromo = {
  marca: string | null;
  coleccionIds: string[];
};

/**
 * Devuelve el mejor porcentaje de descuento aplicable a un producto según las
 * promociones activas. Si varias aplican, gana la de mayor porcentaje.
 */
export function descuentoProducto(
  promos: PromoActiva[],
  prod: ProductoPromo
): number {
  let pct = 0;
  const marcaProd = (prod.marca || "").trim().toLowerCase();
  for (const p of promos) {
    let aplica = false;
    if (p.alcance === "TIENDA") {
      aplica = true;
    } else if (p.alcance === "COLECCION") {
      aplica = !!p.coleccionId && prod.coleccionIds.includes(p.coleccionId);
    } else if (p.alcance === "MARCA") {
      aplica =
        !!p.marca && marcaProd === p.marca.trim().toLowerCase();
    }
    if (aplica && p.porcentaje > pct) pct = p.porcentaje;
  }
  return Math.max(0, Math.min(100, pct));
}

/** Aplica un porcentaje de descuento a un precio y redondea a 2 decimales. */
export function aplicarDescuento(precio: number, pct: number): number {
  if (!pct || pct <= 0) return precio;
  return Math.round(precio * (1 - pct / 100) * 100) / 100;
}

/** True si una promoción está vigente ahora (activa y dentro de fechas). */
export function promoVigente(
  p: { activa: boolean; inicio: string | Date; fin: string | Date },
  ahora: Date = new Date()
): boolean {
  if (!p.activa) return false;
  const i = new Date(p.inicio);
  const f = new Date(p.fin);
  return i <= ahora && ahora <= f;
}
