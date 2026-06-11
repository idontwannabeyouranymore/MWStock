import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Cambia el correo y la contraseña del admin de una tienda.
 *
 * Ver las tiendas y sus admin:
 *   npx tsx prisma/cambiar-credenciales.ts
 *
 * Cambiar credenciales de una tienda (por su slug):
 *   npx tsx prisma/cambiar-credenciales.ts <slug> <nuevoCorreo> <nuevaContraseña>
 *
 * Ejemplo:
 *   npx tsx prisma/cambiar-credenciales.ts ventasab admin@ventasab.com claveSegura123
 */
async function main() {
  const [slug, nuevoEmail, nuevaPassword] = process.argv.slice(2);

  // Sin argumentos: listar tiendas y su admin actual.
  if (!slug) {
    const tiendas = await prisma.tienda.findMany({
      include: { usuario: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });

    if (tiendas.length === 0) {
      console.log("No hay tiendas.");
      return;
    }

    console.log("Tiendas y su admin:");
    for (const t of tiendas) {
      console.log(`  slug: ${t.slug}  ·  admin: ${t.usuario?.email}`);
    }
    console.log(
      "\nPara cambiar: npx tsx prisma/cambiar-credenciales.ts <slug> <nuevoCorreo> <nuevaContraseña>"
    );
    return;
  }

  if (!nuevoEmail || !nuevaPassword) {
    console.error(
      "Uso: npx tsx prisma/cambiar-credenciales.ts <slug> <nuevoCorreo> <nuevaContraseña>"
    );
    process.exit(1);
  }

  if (nuevaPassword.length < 6) {
    console.error("La contraseña debe tener al menos 6 caracteres.");
    process.exit(1);
  }

  const tienda = await prisma.tienda.findUnique({
    where: { slug },
    include: { usuario: true },
  });

  if (!tienda) {
    console.error(`No existe una tienda con el slug "${slug}".`);
    process.exit(1);
  }

  // El correo nuevo no puede estar usado por otro usuario.
  const existente = await prisma.usuario.findUnique({
    where: { email: nuevoEmail },
  });

  if (existente && existente.id !== tienda.usuarioId) {
    console.error(`El correo ${nuevoEmail} ya está en uso por otro usuario.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(nuevaPassword, 10);

  await prisma.usuario.update({
    where: { id: tienda.usuarioId },
    data: { email: nuevoEmail, password: passwordHash },
  });

  console.log("Credenciales actualizadas:");
  console.log(`  Tienda:       ${tienda.nombre} (${tienda.slug})`);
  console.log(`  Nuevo correo: ${nuevoEmail}`);
  console.log("  Entra en /login con el nuevo correo y contraseña.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
