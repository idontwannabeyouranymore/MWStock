import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Borra TODOS los productos y sus datos relacionados (tallas/variantes,
 * movimientos de inventario, imágenes y vínculos con colecciones).
 * Las colecciones NO se borran.
 *
 * Úsalo para limpiar los productos de prueba:
 *   npx tsx prisma/borrar-productos.ts
 */
async function main() {
  const productos = await prisma.producto.findMany({ select: { id: true } });
  const productoIds = productos.map((p) => p.id);

  if (productoIds.length === 0) {
    console.log("No hay productos que borrar.");
    return;
  }

  const variantes = await prisma.variante.findMany({
    where: { productoId: { in: productoIds } },
    select: { id: true },
  });
  const varianteIds = variantes.map((v) => v.id);

  await prisma.movimientoInventario.deleteMany({
    where: { varianteId: { in: varianteIds } },
  });

  await prisma.variante.deleteMany({
    where: { productoId: { in: productoIds } },
  });

  await prisma.productoColeccion.deleteMany({
    where: { productoId: { in: productoIds } },
  });

  await prisma.productoImagen.deleteMany({
    where: { productoId: { in: productoIds } },
  });

  await prisma.producto.deleteMany({});

  console.log(
    `Borrados ${productoIds.length} producto(s) y todos sus datos relacionados.`
  );
  console.log(
    "Nota: las imágenes siguen en Cloudinary. Bórralas desde el panel de " +
      "Cloudinary si quieres liberar espacio."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
