import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        colecciones: {
          include: {
            coleccion: true,
          },
        },
        imagenes: true,
        variantes: true,
      },
    });

    if (!producto) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error("GET /api/productos/[id]", error);

    return NextResponse.json(
      { error: "Error al obtener producto" },
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

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        marca: body.marca,
        precio: body.precio,
        estado: body.estado,
        destacado: body.destacado,
      },
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error("PATCH /api/productos/[id]", error);

    return NextResponse.json(
      { error: "Error al actualizar producto" },
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

    const producto = await prisma.producto.update({
      where: { id },
      data: {
        estado: "ARCHIVADO",
      },
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error("DELETE /api/productos/[id]", error);

    return NextResponse.json(
      { error: "Error al archivar producto" },
      { status: 500 }
    );
  }
  
}