import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const usuario = await prisma.usuario.upsert({
    where: {
      email: "admin@mwstock.com",
    },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@mwstock.com",
      rol: "ADMIN",
    },
  });

  const tienda = await prisma.tienda.upsert({
    where: {
      slug: "mwstock",
    },
    update: {},
    create: {
      nombre: "MWStock",
      descripcion: "Tienda de ropa urbana",
      whatsapp: "5210000000000",
      instagram: "@mwstock",
      slug: "mwstock",
      usuarioId: usuario.id,
    },
  });

  console.log("Usuario creado o encontrado:", usuario.id);
  console.log("Tienda creada o encontrada:", tienda.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });