import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Transformación de Cloudinary que quita el fondo y lo deja blanco.
const TRANSF_FONDO_BLANCO = "e_background_removal,b_white";

/**
 * Inserta la transformación de fondo blanco en una URL de Cloudinary.
 * Idempotente: no la agrega dos veces. Devuelve la URL igual si no es de Cloudinary.
 */
export function aplicarFondoBlanco(url: string): string {
  if (!url.includes("/upload/")) return url;
  if (url.includes("e_background_removal")) return url;
  return url.replace("/upload/", `/upload/${TRANSF_FONDO_BLANCO}/`);
}

/**
 * Extrae el public_id de una URL de Cloudinary.
 * Ej: https://res.cloudinary.com/abc/image/upload/v123/mwstock/productos/xyz.jpg
 *  ->  mwstock/productos/xyz
 * Ignora la transformación de fondo blanco si está presente.
 */
export function publicIdDesdeUrl(url: string): string | null {
  const limpia = url.replace(`/upload/${TRANSF_FONDO_BLANCO}/`, "/upload/");
  const match = limpia.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
}

/**
 * Borra una imagen de Cloudinary a partir de su URL. No lanza error si falla
 * (no queremos que un fallo de limpieza rompa el borrado en la BD).
 */
export async function eliminarDeCloudinary(url: string): Promise<void> {
  const publicId = publicIdDesdeUrl(url);

  if (!publicId) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Error al eliminar de Cloudinary:", publicId, error);
  }
}

export { cloudinary };
