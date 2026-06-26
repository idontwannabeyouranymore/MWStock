import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// DELETE: el admin elimina una cuenta de vendedor de su tienda.
export async function DELETE(_request: Request, { params }: Params) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if ((await obtenerRol()) !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  }

  const { id } = await params;
  const vendedor = await prisma.usuario.findUnique({ where: { id } });

  if (
    !vendedor ||
    vendedor.rol !== "VENDEDOR" ||
    vendedor.tiendaTrabajoId !== tienda.id
  ) {
    return NextResponse.json(
      { error: "Vendedor no encontrado" },
      { status: 404 }
    );
  }

  await prisma.usuario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
