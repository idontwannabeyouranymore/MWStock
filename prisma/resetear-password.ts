import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Ver usuarios y resetear contraseñas (sirve para dueño y admins).
 *
 * Ver todos los usuarios (correo + rol):
 *   npx tsx prisma/resetear-password.ts
 *
 * Cambiar la contraseña de un usuario:
 *   npx tsx prisma/resetear-password.ts <correo> <nuevaContraseña>
 *
 * Ejemplo:
 *   npx tsx prisma/resetear-password.ts dueno@correo.com NuevaClave123
 */
async function main() {
  const [email, nuevaPassword] = process.argv.slice(2);

  // Sin argumentos: listar todos los usuarios.
  if (!email) {
    const usuarios = await prisma.usuario.findMany({
      select: { email: true, nombre: true, rol: true },
      orderBy: { createdAt: "asc" },
    });

    if (usuarios.length === 0) {
      console.log("No hay usuarios en la base.");
      return;
    }

    console.log("Usuarios registrados:");
    for (const u of usuarios) {
      console.log(`  [${u.rol}]  ${u.email}   (${u.nombre})`);
    }
    console.log(
      "\nPara cambiar contraseña: npx tsx prisma/resetear-password.ts <correo> <nuevaContraseña>"
    );
    return;
  }

  if (!nuevaPassword) {
    console.error(
      "Uso: npx tsx prisma/resetear-password.ts <correo> <nuevaContraseña>"
    );
    process.exit(1);
  }

  if (nuevaPassword.length < 6) {
    console.error("La contraseña debe tener al menos 6 caracteres.");
    process.exit(1);
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario) {
    console.error(`No existe un usuario con el correo ${email}.`);
    process.exit(1);
  }

  const hash = await bcrypt.hash(nuevaPassword, 10);
  await prisma.usuario.update({
    where: { email },
    data: { password: hash },
  });

  console.log(
    `Contraseña actualizada para ${email} (rol ${usuario.rol}). Ya puedes entrar con la nueva.`
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
