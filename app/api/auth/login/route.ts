import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { crearToken } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json();

  const usuario = await prisma.usuario.findUnique({
    where: {
      email: body.email,
    },
    include: { tienda: true },
  });

  if (!usuario || !usuario.password) {
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 }
    );
  }

  const passwordValida = await bcrypt.compare(
    body.password,
    usuario.password
  );

  if (!passwordValida) {
    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 }
    );
  }

  // Bloquea el acceso si la tienda del admin está suspendida.
  if (usuario.rol === "ADMIN" && usuario.tienda && !usuario.tienda.activa) {
    return NextResponse.json(
      { error: "Esta tienda está suspendida. Contacta al administrador." },
      { status: 403 }
    );
  }

  const token = await crearToken({
    userId: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
  });

  const response = NextResponse.json({ ok: true, rol: usuario.rol });

  response.cookies.set("mwstock_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}