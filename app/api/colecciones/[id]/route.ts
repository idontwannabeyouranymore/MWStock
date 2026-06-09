import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const coleccion = await prisma.coleccion.findUnique({
      where: { id },
    });

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const coleccion = await prisma.coleccion.update({
      where: { id },
      data: {
        estado: "ARCHIVADA",
      },
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
