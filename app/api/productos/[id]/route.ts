import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const data: {
      nombre?: string;
      descripcion?: string | null;
      marca?: string | null;
      precio?: number;
      estado?: "ACTIVO" | "AGOTADO" | "ARCHIVADO";
      destacado?: boolean;
    } = {};

    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.descripcion !== undefined) data.descripcion = body.descripcion;
    if (body.marca !== undefined) data.marca = body.marca;
    if (body.precio !== undefined) data.precio = Number(body.precio);
    if (body.estado !== undefined) data.estado = body.estado;
    if (body.destacado !== undefined) data.destacado = body.destacado;

    const producto = await prisma.producto.update({
      where: { id },
      data,
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

export async function DELETE(_request: Request, context: RouteContext) {
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