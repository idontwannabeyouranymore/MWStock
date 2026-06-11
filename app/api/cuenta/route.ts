import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { obtenerUsuarioId } from "@/lib/auth";

export async function GET() {
  const usuarioId = await obtenerUsuarioId();
  if (!usuarioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { email: true, nombre: true },
  });

  if (!usuario) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(usuario);
}

export async function PATCH(request: Request) {
  const usuarioId = await obtenerUsuarioId();
  if (!usuarioId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const passwordActual: string = body.passwordActual || "";
  const emailNuevo: string = (body.emailNuevo || "").trim();
  const passwordNueva: string = body.passwordNueva || "";

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
  });

  if (!usuario || !usuario.password) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  // Verifica la contraseña actual antes de cualquier cambio.
  if (!passwordActual) {
    return NextResponse.json(
      { error: "Ingresa tu contraseña actual" },
      { status: 400 }
    );
  }

  const valida = await bcrypt.compare(passwordActual, usuario.password);
  if (!valida) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta" },
      { status: 400 }
    );
  }

  const data: { email?: string; password?: string } = {};

  if (emailNuevo && emailNuevo !== usuario.email) {
    const existe = await prisma.usuario.findUnique({
      where: { email: emailNuevo },
    });
    if (existe && existe.id !== usuarioId) {
      return NextResponse.json(
        { error: "Ese correo ya está en uso" },
        { status: 400 }
      );
    }
    data.email = emailNuevo;
  }

  if (passwordNueva) {
    if (passwordNueva.length < 6) {
      return NextResponse.json(
        { error: "La nueva contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }
    data.password = await bcrypt.hash(passwordNueva, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios que guardar" },
      { status: 400 }
    );
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data,
  });

  return NextResponse.json({
    ok: true,
    email: data.email ?? usuario.email,
    cambioEmail: Boolean(data.email),
  });
}
