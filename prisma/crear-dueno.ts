import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Crea la cuenta de DUEÑO de la plataforma (super-admin).
 * El dueño no tiene tienda propia; administra todas desde /dueno.
 *
 * Uso:
 *   npx tsx prisma/crear-dueno.ts "Tu Nombre" "dueno@correo.com" "contraseña"
 *
 * Después entra en /login con ese correo y contraseña; te llevará a /dueno.
 */
async function main() {
  const [nombre, email, password] = process.argv.slice(2);

  if (!nombre || !email || !password) {
    console.error(
      'Uso: npx tsx prisma/crear-dueno.ts "Tu Nombre" "dueno@correo.com" "contraseña"'
    );
    process.exit(1);
  }

  if (password.length < 6) {
    console.error("La contraseña debe tener al menos 6 caracteres.");
    process.exit(1);
  }

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) {
    console.error(`Ya existe un usuario con el correo ${email}.`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const usuario = await prisma.usuario.create({
    data: {
      nombre,
      email,
      password: passwordHash,
      rol: "DUENO",
    },
  });

  console.log("Cuenta de dueño creada:");
  console.log(`  Nombre: ${usuario.nombre}`);
  console.log(`  Correo: ${email}`);
  console.log("  Entra en /login con ese correo y contraseña → te lleva a /dueno.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
