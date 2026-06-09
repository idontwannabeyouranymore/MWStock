import * as Prisma from "@prisma/client";
import bcrypt from "bcryptjs";

// Some TypeScript setups may not expose PrismaClient as a named export in a way
// that the compiler recognizes. Use a runtime-safe access and cast to any to
// avoid compilation errors while still creating the client instance.
const prisma = new (Prisma as any).PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.usuario.update({
    where: {
      email: "admin@mwstock.com",
    },
    data: {
      password: passwordHash,
    },
  });

  console.log("Contraseña actualizada");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });