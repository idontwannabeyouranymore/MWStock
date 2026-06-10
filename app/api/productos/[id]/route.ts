import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      colecciones: { include: { coleccion: true } },
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
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const producto = await prisma.producto.update({
    where: { id },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
      ...(body.marca !== undefined && { marca: body.marca }),
      ...(body.precio !== undefined && { precio: Number(body.precio) }),
      ...(body.estado !== undefined && { estado: body.estado }),
      ...(body.destacado !== undefined && { destacado: body.destacado }),
    },
  });

  return NextResponse.json(producto);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  await prisma.$transaction(async (tx) => {
    const variantes = await tx.variante.findMany({
      where: { productoId: id },
      select: { id: true },
    });

    const varianteIds = variantes.map((variante) => variante.id);

    await tx.movimientoInventario.deleteMany({
      where: {
        varianteId: {
          in: varianteIds,
        },
      },
    });

    await tx.variante.deleteMany({
      where: {
        productoId: id,
      },
    });

    await tx.productoColeccion.deleteMany({
      where: {
        productoId: id,
      },
    });

    await tx.productoImagen.deleteMany({
      where: {
        productoId: id,
      },
    });

    await tx.producto.delete({
      where: {
        id,
      },
    });
  });

  return NextResponse.json({ ok: true });
}