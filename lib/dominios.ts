// Helpers para construir URLs de tiendas (modo por ruta).
// Cada tienda vive en <dominioRaiz>/tienda/<slug>.

export function dominioRaiz() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
}

function protocolo(root: string) {
  return root.includes("localhost") ? "http" : "https";
}

/**
 * URL pública absoluta del catálogo de una tienda (para QR, panel dueño, etc.).
 */
export function urlDeTienda(slug: string) {
  const root = dominioRaiz();
  return `${protocolo(root)}://${root}/tienda/${slug}`;
}

/**
 * Enlace interno (href de <Link>) dentro del catálogo, siempre por ruta.
 */
export function enlaceCatalogo(slug: string, path: string = "/") {
  const limpio = path === "/" ? "" : path;
  return `/tienda/${slug}${limpio}`;
}
