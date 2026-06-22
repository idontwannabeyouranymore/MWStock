import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { esDueno } from "@/lib/auth";
import { normalizarModulos } from "@/lib/modulos";

export async function GET() {
  if (!(await esDueno())) {
    return NextResponse.json({ error: "Solo el dueño" }, { status: 403 });
  }

  const tiendas = await prisma.tienda.findMany({
    orderBy: { createdAt: "asc" },
    include: { usuario: { select: { email: true } } },
  });

  const data = await Promise.all(
    tiendas.map(async (tienda) => {
      const [productos, stock, ventas] = await Promise.all([
        prisma.producto.count({
          where: { tiendaId: tienda.id, estado: { not: "ARCHIVADO" } },
        }),
        prisma.variante.aggregate({
          where: {
            producto: { tiendaId: tienda.id },
            estado: { not: "ARCHIVADA" },
          },
          _sum: { stock: true },
        }),
        prisma.venta.aggregate({
          where: { tiendaId: tienda.id },
          _sum: { total: true },
          _count: true,
        }),
      ]);

      return {
        id: tienda.id,
        nombre: tienda.nombre,
        slug: tienda.slug,
        activa: tienda.activa,
        modulos: normalizarModulos(tienda.modulos),
        email: tienda.usuario?.email ?? null,
        productos,
        stock: stock._sum.stock ?? 0,
        ventas: ventas._count,
        ingresos: Number(ventas._sum.total ?? 0),
      };
    })
  );

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  if (!(await esDueno())) {
    return NextResponse.json({ error: "Solo el dueño" }, { status: 403 });
  }

  const body = await request.json();

  const nombre = body.nombre?.trim();
  const email = body.email?.trim();
  const password = body.password;
  const slug = (body.slug || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!nombre || !email || !password || !slug) {
    return NextResponse.json(
      { error: "Nombre, correo, contraseña y slug son obligatorios" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  const existeEmail = await prisma.usuario.findUnique({ where: { email } });
  if (existeEmail) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese correo" },
      { status: 400 }
    );
  }

  const existeSlug = await prisma.tienda.findUnique({ where: { slug } });
  if (existeSlug) {
    return NextResponse.json(
      { error: `Ya existe una tienda con el slug "${slug}"` },
      { status: 400 }
    );
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
    data: { nombre, slug, usuarioId: usuario.id },
  });

  return NextResponse.json(tienda, { status: 201 });
}
