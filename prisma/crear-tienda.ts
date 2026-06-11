import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Da de alta una tienda nueva con su usuario administrador.
 *
 * Uso:
 *   npx tsx prisma/crear-tienda.ts "Nombre de la tienda" "correo@ejemplo.com" "contraseña" "slug"
 *
 * Ejemplo:
 *   npx tsx prisma/crear-tienda.ts "Ropa Urbana JR" "jr@correo.com" "claveSegura1" "ropa-urbana-jr"
 *
 * El admin entra después en /login con ese correo y contraseña, y su catálogo
 * público queda en /tienda/<slug>.
 */
async function main() {
  const [nombre, email, password, slugRaw] = process.argv.slice(2);

  if (!nombre || !email || !password || !slugRaw) {
    console.error(
      'Uso: npx tsx prisma/crear-tienda.ts "Nombre" "correo@ejemplo.com" "contraseña" "slug"'
    );
    process.exit(1);
  }

  const slug = slugRaw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    console.error("El slug no es válido.");
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("La contraseña debe tener al menos 6 caracteres.");
    process.exit(1);
  }

  const existeEmail = await prisma.usuario.findUnique({ where: { email } });
  if (existeEmail) {
    console.error(`Ya existe un usuario con el correo ${email}.`);
    process.exit(1);
  }

  const existeSlug = await prisma.tienda.findUnique({ where: { slug } });
  if (existeSlug) {
    console.error(`Ya existe una tienda con el slug "${slug}".`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre: `Admin ${nombre}`,
      email,
      password: passwordHash,
      rol: "ADMIN",
    },
  });

  const tienda = await prisma.tienda.create({
    data: {
      nombre,
      slug,
      usuarioId: usuario.id,
    },
  });

  console.log("Tienda creada con éxito:");
  console.log(`  Nombre:   ${tienda.nombre}`);
  console.log(`  Slug:     ${tienda.slug}`);
  console.log(`  Admin:    ${email}`);
  console.log(`  Catálogo: /tienda/${tienda.slug}`);
  console.log("  El admin entra en /login con ese correo y contraseña.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
