/**
 * Quita la transformación de "fondo blanco" (e_background_removal,b_white) de
 * las URLs de imágenes ya guardadas. Esa transformación necesita un add-on de
 * Cloudinary; sin él las imágenes se ven rotas. Al quitarla, vuelven a cargar
 * con su fondo original.
 *
 * Uso:  npx tsx prisma/arreglar-imagenes.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEG = "/upload/e_background_removal,b_white/";

function limpiar(url: string | null): string | null {
  if (!url) return url;
  if (url.includes(SEG)) return url.replace(SEG, "/upload/");
  // Por si quedó solo "e_background_removal" sin el b_white.
  if (url.includes("/upload/e_background_removal/")) {
    return url.replace("/upload/e_background_removal/", "/upload/");
  }
  return url;
}

async function main() {
  // 1) Imágenes de producto
  const imgs = await prisma.productoImagen.findMany({
    where: { url: { contains: "e_background_removal" } },
  });
  let nImgs = 0;
  for (const i of imgs) {
    const nueva = limpiar(i.url);
    if (nueva && nueva !== i.url) {
      await prisma.productoImagen.update({
        where: { id: i.id },
        data: { url: nueva },
      });
      nImgs++;
    }
  }
  console.log(`Imágenes de producto arregladas: ${nImgs}`);

  // 2) Imágenes de colección
  const cols = await prisma.coleccion.findMany({
    where: { imagenUrl: { contains: "e_background_removal" } },
  });
  for (const c of cols) {
    await prisma.coleccion.update({
      where: { id: c.id },
      data: { imagenUrl: limpiar(c.imagenUrl) },
    });
  }
  console.log(`Colecciones arregladas: ${cols.length}`);

  // 3) Imágenes de marca (guardadas en Tienda.imagenesMarcas)
  const tiendas = await prisma.tienda.findMany();
  let nTiendas = 0;
  for (const t of tiendas) {
    const mapa = t.imagenesMarcas;
    if (mapa && typeof mapa === "object" && !Array.isArray(mapa)) {
      let cambio = false;
      const nuevo: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(mapa as Record<string, unknown>)) {
        if (typeof v === "string") {
          const nv = limpiar(v);
          if (nv !== v) cambio = true;
          nuevo[k] = nv;
        } else {
          nuevo[k] = v;
        }
      }
      if (cambio) {
        await prisma.tienda.update({
          where: { id: t.id },
          data: { imagenesMarcas: nuevo },
        });
        nTiendas++;
      }
    }
  }
  console.log(`Tiendas (imágenes de marca) arregladas: ${nTiendas}`);

  console.log("\n✔ Listo. Recarga el catálogo (puede tardar unos minutos por la caché).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
