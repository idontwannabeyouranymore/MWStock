import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function propia(id: string, tiendaId: string) {
  const m = await prisma.mayoreo.findUnique({
    where: { id },
    select: { id: true, tiendaId: true },
  });
  return m && m.tiendaId === tiendaId ? m : null;
}

export async function PATCH(request: Request, ctx: Ctx) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if ((await obtenerRol()) !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!(await propia(id, tienda.id))) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  const body = await request.json();
  const mayoreo = await prisma.mayoreo.update({
    where: { id },
    data: {
      ...(typeof body.activo === "boolean" && { activo: body.activo }),
    },
  });
  return NextResponse.json(mayoreo);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if ((await obtenerRol()) !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!(await propia(id, tienda.id))) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  await prisma.mayoreo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
