import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

// Verifica que la colección exista y sea de la tienda en sesión.
async function coleccionPropia(id: string, tiendaId: string) {
  const coleccion = await prisma.coleccion.findUnique({ where: { id } });
  if (!coleccion || coleccion.tiendaId !== tiendaId) return null;
  return coleccion;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;
    const coleccion = await coleccionPropia(id, tienda.id);

    if (!coleccion) {
      return NextResponse.json(
        { error: "Colección no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(coleccion);
  } catch (error) {
    console.error("GET /api/colecciones/[id]", error);
    return NextResponse.json(
      { error: "Error al obtener colección" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!(await coleccionPropia(id, tienda.id))) {
      return NextResponse.json(
        { error: "Colección no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const coleccion = await prisma.coleccion.update({
      where: { id },
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        imagenUrl: body.imagenUrl,
        estado: body.estado,
        orden: body.orden,
      },
    });

    return NextResponse.json(coleccion);
  } catch (error) {
    console.error("PATCH /api/colecciones/[id]", error);
    return NextResponse.json(
      { error: "Error al actualizar colección" },
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

    if (!(await coleccionPropia(id, tienda.id))) {
      return NextResponse.json(
        { error: "Colección no encontrada" },
        { status: 404 }
      );
    }

    const coleccion = await prisma.coleccion.update({
      where: { id },
      data: { estado: "ARCHIVADA" },
    });

    return NextResponse.json(coleccion);
  } catch (error) {
    console.error("DELETE /api/colecciones/[id]", error);
    return NextResponse.json(
      { error: "Error al archivar colección" },
      { status: 500 }
    );
  }
}
