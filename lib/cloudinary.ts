import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extrae el public_id de una URL de Cloudinary.
 * Ej: https://res.cloudinary.com/abc/image/upload/v123/mwstock/productos/xyz.jpg
 *  ->  mwstock/productos/xyz
 * Funciona porque las subidas no usan transformaciones en la URL.
 */
export function publicIdDesdeUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
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
