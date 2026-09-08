// Funciones PURAS para el precio de mayoreo (sin prisma). Se usan en el
// servidor y en el carrito de mayoreo (cliente).

export type NivelMayoreo = {
  min: number; // a partir de esta cantidad (de un mismo producto)
  tipo: "porcentaje" | "precio";
  valor: number; // % de descuento, o precio unitario fijo
};

export type MayoreoConfig = {
  alcance: "COLECCION" | "MARCA";
  coleccionId: string | null;
  marca: string | null;
  niveles: NivelMayoreo[];
};

export type ProductoMayoreo = {
  marca: string | null;
  coleccionIds: string[];
};

// Convierte un valor JSON (de la base) en un arreglo de niveles válido y ordenado.
export function normalizarNiveles(valor: unknown): NivelMayoreo[] {
  if (!Array.isArray(valor)) return [];
  const out: NivelMayoreo[] = [];
  for (const n of valor) {
    if (!n || typeof n !== "object") continue;
    const o = n as Record<string, unknown>;
    const min = Number(o.min);
    const valorN = Number(o.valor);
    const tipo = o.tipo === "precio" ? "precio" : "porcentaje";
    if (Number.isFinite(min) && min >= 1 && Number.isFinite(valorN) && valorN >= 0) {
      out.push({ min: Math.round(min), tipo, valor: valorN });
    }
  }
  return out.sort((a, b) => a.min - b.min);
}

// Niveles aplicables a un producto (juntando colección y marca que le apliquen).
export function nivelesDeProducto(
  configs: MayoreoConfig[],
  prod: ProductoMayoreo
): NivelMayoreo[] {
  const marca = (prod.marca || "").trim().toLowerCase();
  const juntos: NivelMayoreo[] = [];
  for (const c of configs) {
    let aplica = false;
    if (c.alcance === "COLECCION") {
      aplica = !!c.coleccionId && prod.coleccionIds.includes(c.coleccionId);
    } else if (c.alcance === "MARCA") {
      aplica = !!c.marca && marca === c.marca.trim().toLowerCase();
    }
    if (aplica) juntos.push(...c.niveles);
  }
  return juntos;
}

// True si el producto está en mayoreo (tiene al menos un nivel aplicable).
export function enMayoreo(configs: MayoreoConfig[], prod: ProductoMayoreo): boolean {
  return nivelesDeProducto(configs, prod).length > 0;
}

/**
 * Precio unitario según la cantidad. Toma el mejor (más bajo) entre todos los
 * niveles que apliquen para esa cantidad. Si ninguno aplica, el precio base.
 */
export function precioMayoreo(
  precioBase: number,
  niveles: NivelMayoreo[],
  cantidad: number
): number {
  let mejor = precioBase;
  for (const n of niveles) {
    if (cantidad >= n.min) {
      const p =
        n.tipo === "porcentaje"
          ? precioBase * (1 - n.valor / 100)
          : n.valor;
      if (p < mejor) mejor = p;
    }
  }
  return Math.round(mejor * 100) / 100;
}
