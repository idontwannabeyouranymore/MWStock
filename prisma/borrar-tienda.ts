/**
 * Borra una tienda y TODOS sus datos (catálogo, ventas, clientes, tandas…)
 * junto con su usuario admin. NO toca al dueño.
 *
 * Uso:
 *   npx tsx prisma/borrar-tienda.ts                 -> lista todas las tiendas
 *   npx tsx prisma/borrar-tienda.ts <slug>          -> borra la tienda con ese slug
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2];

  // Sin argumento: listar tiendas para identificar la que sobra.
  if (!slug) {
    const tiendas = await prisma.tienda.findMany({
      orderBy: { createdAt: "asc" },
      include: { usuario: { select: { email: true, rol: true } } },
    });
    console.log(`\n${tiendas.length} tienda(s):\n`);
    for (const t of tiendas) {
      console.log(
        `  slug: ${t.slug.padEnd(20)} | nombre: ${(t.nombre || "").padEnd(
          24
        )} | admin: ${t.usuario?.email ?? "(sin usuario)"} `
      );
    }
    console.log(
      `\nPara borrar una:  npx tsx prisma/borrar-tienda.ts <slug>\n`
    );
    return;
  }

  const tienda = await prisma.tienda.findUnique({
    where: { slug },
    include: { usuario: { select: { id: true, email: true, rol: true } } },
  });

  if (!tienda) {
    console.log(`\nNo existe una tienda con slug "${slug}".\n`);
    return;
  }

  if (tienda.usuario?.rol === "DUENO") {
    console.log(`\n⛔ "${slug}" pertenece al DUEÑO. No se borra por seguridad.\n`);
    return;
  }

  const tiendaId = tienda.id;
  console.log(`\nBorrando tienda "${tienda.nombre}" (${slug})...`);

  await prisma.$transaction(async (tx) => {
    await tx.ventaItem.deleteMany({ where: { venta: { tiendaId } } });
    await tx.venta.deleteMany({ where: { tiendaId } });
    await tx.retiroCaja.deleteMany({ where: { tiendaId } });
    await tx.usoIA.deleteMany({ where: { tiendaId } });
    await tx.movimientoInventario.deleteMany({
      where: { variante: { producto: { tiendaId } } },
    });
    await tx.productoImagen.deleteMany({ where: { producto: { tiendaId } } });
    await tx.productoColeccion.deleteMany({
      where: { producto: { tiendaId } },
    });
    await tx.variante.deleteMany({ where: { producto: { tiendaId } } });
    await tx.producto.deleteMany({ where: { tiendaId } });
    await tx.coleccion.deleteMany({ where: { tiendaId } });
    await tx.tienda.delete({ where: { id: tiendaId } });
    if (tienda.usuario) {
      await tx.usuario.delete({ where: { id: tienda.usuario.id } });
    }
  });

  console.log(`✔ Tienda "${slug}" y su usuario admin eliminados.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
