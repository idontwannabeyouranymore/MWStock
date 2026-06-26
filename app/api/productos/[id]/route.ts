import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eliminarDeCloudinary } from "@/lib/cloudinary";
import { obtenerTiendaDeSesion } from "@/lib/auth";
import { canonizarMarca } from "@/lib/marca";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      colecciones: { include: { coleccion: true } },
      imagenes: true,
      variantes: true,
    },
  });

  if (!producto || producto.tiendaId !== tienda.id) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json(producto);
}

export async function PATCH(request: Request, context: RouteContext) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const existente = await prisma.producto.findUnique({
    where: { id },
    select: { tiendaId: true },
  });

  if (!existente || existente.tiendaId !== tienda.id) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  const body = await request.json();

  const marcaCanon =
    body.marca !== undefined
      ? await canonizarMarca(tienda.id, body.marca)
      : undefined;

  const producto = await prisma.producto.update({
    where: { id },
    data: {
      ...(body.nombre !== undefined && { nombre: body.nombre }),
      ...(body.descripcion !== undefined && { descripcion: body.descripcion }),
      ...(marcaCanon !== undefined && { marca: marcaCanon }),
      ...(body.codigoBarras !== undefined && {
        codigoBarras: body.codigoBarras || null,
      }),
      ...(body.precio !== undefined && { precio: Number(body.precio) }),
      ...(body.estado !== undefined && { estado: body.estado }),
      ...(body.destacado !== undefined && { destacado: body.destacado }),
    },
  });

  return NextResponse.json(producto);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const existente = await prisma.producto.findUnique({
    where: { id },
    select: { tiendaId: true },
  });

  if (!existente || existente.tiendaId !== tienda.id) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  const imagenes = await prisma.productoImagen.findMany({
    where: { productoId: id },
    select: { url: true },
  });

  await prisma.$transaction(async (tx) => {
    const variantes = await tx.variante.findMany({
      where: { productoId: id },
      select: { id: true },
    });

    const varianteIds = variantes.map((variante) => variante.id);

    await tx.movimientoInventario.deleteMany({
      where: { varianteId: { in: varianteIds } },
    });

    await tx.variante.deleteMany({ where: { productoId: id } });
    await tx.productoColeccion.deleteMany({ where: { productoId: id } });
    await tx.productoImagen.deleteMany({ where: { productoId: id } });
    await tx.producto.delete({ where: { id } });
  });

  await Promise.all(imagenes.map((imagen) => eliminarDeCloudinary(imagen.url)));

  return NextResponse.json({ ok: true });
}
