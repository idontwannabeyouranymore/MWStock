// Helpers para construir URLs de tiendas.
//
// Hay dos modos, controlados por NEXT_PUBLIC_SUBDOMINIOS:
//   - "true"  → cada tienda en su subdominio: https://<slug>.<dominioRaiz>
//   - cualquier otro valor (por defecto) → por ruta: https://<dominioRaiz>/tienda/<slug>

export function dominioRaiz() {
  return process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
}

function protocolo(root: string) {
  return root.includes("localhost") ? "http" : "https";
}

export function subdominiosActivos() {
  return process.env.NEXT_PUBLIC_SUBDOMINIOS === "true";
}

/**
 * URL pública absoluta del catálogo de una tienda (para QR, panel dueño, etc.).
 */
export function urlDeTienda(slug: string) {
  const root = dominioRaiz();
  const proto = protocolo(root);

  if (subdominiosActivos()) {
    return `${proto}://${slug}.${root}`;
  }

  return `${proto}://${root}/tienda/${slug}`;
}

/**
 * Enlace interno (href de <Link>) dentro del catálogo.
 * - Con subdominios: relativo al subdominio ("/", "/coleccion/x", "/producto/x").
 * - Sin subdominios: con prefijo de la tienda ("/tienda/<slug>/...").
 */
export function enlaceCatalogo(slug: string, path: string = "/") {
  if (subdominiosActivos()) {
    return path;
  }

  const limpio = path === "/" ? "" : path;
  return `/tienda/${slug}${limpio}`;
}
