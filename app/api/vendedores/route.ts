import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

// GET: lista los vendedores de la tienda (solo el admin).
export async function GET() {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if ((await obtenerRol()) !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  }

  const vendedores = await prisma.usuario.findMany({
    where: { tiendaTrabajoId: tienda.id, rol: "VENDEDOR" },
    select: { id: true, nombre: true, email: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(vendedores);
}

// POST: el admin da de alta una cuenta de vendedor.
export async function POST(request: Request) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if ((await obtenerRol()) !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  }

  const body = await request.json();
  const nombre = (body.nombre || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!nombre || !email || !password) {
    return NextResponse.json(
      { error: "Nombre, correo y contraseña son obligatorios" },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese correo" },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const vendedor = await prisma.usuario.create({
    data: {
      nombre,
      email,
      password: passwordHash,
      rol: "VENDEDOR",
      tiendaTrabajoId: tienda.id,
    },
    select: { id: true, nombre: true, email: true, createdAt: true },
  });

  return NextResponse.json(vendedor, { status: 201 });
}
