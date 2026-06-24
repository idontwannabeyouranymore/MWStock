import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eliminarDeCloudinary, aplicarFondoBlanco } from "@/lib/cloudinary";
import { obtenerTiendaDeSesion } from "@/lib/auth";
import { normalizarModulos } from "@/lib/modulos";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Verifica que el producto sea de la tienda en sesión.
async function productoPropio(id: string, tiendaId: string) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    select: { tiendaId: true },
  });
  return producto && producto.tiendaId === tiendaId;
}

export async function GET(_request: Request, context: RouteContext) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!(await productoPropio(id, tienda.id))) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  const imagenes = await prisma.productoImagen.findMany({
    where: { productoId: id },
    orderBy: { orden: "asc" },
  });

  return NextResponse.json(imagenes);
}

export async function POST(request: Request, context: RouteContext) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!(await productoPropio(id, tienda.id))) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  const body = await request.json();

  if (!body.url) {
    return NextResponse.json(
      { error: "La URL de la imagen es obligatoria" },
      { status: 400 }
    );
  }

  let orden = body.orden;

  if (orden === undefined || orden === null) {
    const total = await prisma.productoImagen.count({
      where: { productoId: id },
    });
    orden = total;
  }

  // Si la tienda tiene activo el fondo blanco, se lo aplicamos a la foto.
  const mods = normalizarModulos(tienda.modulos);
  const url = mods.iaFondoBlanco ? aplicarFondoBlanco(body.url) : body.url;

  const imagen = await prisma.productoImagen.create({
    data: { productoId: id, url, orden },
  });

  return NextResponse.json(imagen, { status: 201 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!(await productoPropio(id, tienda.id))) {
    return NextResponse.json(
      { error: "Producto no encontrado" },
      { status: 404 }
    );
  }

  const imagenes = await prisma.productoImagen.findMany({
    where: { productoId: id },
    select: { url: true },
  });

  await prisma.productoImagen.deleteMany({ where: { productoId: id } });

  await Promise.all(imagenes.map((imagen) => eliminarDeCloudinary(imagen.url)));

  return NextResponse.json({ ok: true });
}
