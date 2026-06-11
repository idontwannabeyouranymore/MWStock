import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

// Devuelve la variante si pertenece a la tienda en sesión, si no null.
async function variantePropia(id: string, tiendaId: string) {
  const variante = await prisma.variante.findUnique({
    where: { id },
    include: { producto: { select: { tiendaId: true } } },
  });
  if (!variante || variante.producto.tiendaId !== tiendaId) return null;
  return variante;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!(await variantePropia(id, tienda.id))) {
      return NextResponse.json(
        { error: "Variante no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const stock = body.stock !== undefined ? Number(body.stock) : undefined;

    if (stock !== undefined && stock < 0) {
      return NextResponse.json(
        { error: "El stock no puede ser negativo" },
        { status: 400 }
      );
    }

    const variante = await prisma.variante.update({
      where: { id },
      data: {
        talla: body.talla,
        color: body.color,
        stock,
        estado:
          stock !== undefined
            ? stock > 0
              ? "ACTIVA"
              : "AGOTADA"
            : body.estado,
      },
      include: {
        producto: true,
      },
    });

    return NextResponse.json(variante);
  } catch (error) {
    console.error("PATCH /api/variantes/[id]", error);
    return NextResponse.json(
      { error: "Error al actualizar variante" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!(await variantePropia(id, tienda.id))) {
      return NextResponse.json(
        { error: "Variante no encontrada" },
        { status: 404 }
      );
    }

    const variante = await prisma.variante.update({
      where: { id },
      data: { estado: "ARCHIVADA" },
    });

    return NextResponse.json(variante);
  } catch (error) {
    console.error("DELETE /api/variantes/[id]", error);
    return NextResponse.json(
      { error: "Error al archivar variante" },
      { status: 500 }
    );
  }
}
