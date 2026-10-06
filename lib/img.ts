// Optimiza una URL de Cloudinary para el catálogo: la entrega redimensionada,
// comprimida (q_auto) y en el mejor formato (f_auto). Así se ve igual pero pesa
// una fracción, ahorrando muchísimo ancho de banda.
//
// También quita la transformación de "fondo blanco" (e_background_removal), que
// requiere un add-on y estaba rompiendo algunas imágenes.

export function imgCatalogo(
  url: string | null | undefined,
  ancho: number = 600
): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }

  // Quita la transformación de fondo blanco si viene en la URL.
  let u = url
    .replace("/upload/e_background_removal,b_white/", "/upload/")
    .replace("/upload/e_background_removal/", "/upload/");

  // Si ya tiene nuestra optimización, no la dupliques.
  if (u.includes("/upload/c_limit,")) return u;

  // c_limit = solo reduce (nunca agranda) conservando proporción.
  const transf = `c_limit,w_${ancho},q_auto,f_auto`;
  return u.replace("/upload/", `/upload/${transf}/`);
}
