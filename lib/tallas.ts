// Detecta tallas de "letra" (ropa) para decidir si se muestran en las tarjetas
// del catálogo. Los tenis (tallas numéricas) o presentaciones raras no se
// muestran antes de entrar al producto porque son muchas y se ven mal.

const LETRA = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "2XL",
  "3XL",
  "4XL",
];

const RANGO = new Map(LETRA.map((t, i) => [t, i]));

export function esTallaLetra(talla: string): boolean {
  return RANGO.has(talla.trim().toUpperCase());
}

/**
 * Si TODAS las tallas son de letra (S, M, L, XL...), devuelve la lista ordenada
 * para mostrarla en la tarjeta. Si hay alguna numérica u otra, devuelve [] (no
 * se muestra en la tarjeta).
 */
export function tallasParaTarjeta(tallas: string[]): string[] {
  const limpias = tallas.map((t) => t.trim()).filter(Boolean);
  if (limpias.length === 0) return [];
  if (!limpias.every(esTallaLetra)) return [];
  // Únicas, ordenadas por talla.
  const unicas = [...new Set(limpias.map((t) => t.toUpperCase()))];
  return unicas.sort(
    (a, b) => (RANGO.get(a) ?? 99) - (RANGO.get(b) ?? 99)
  );
}
