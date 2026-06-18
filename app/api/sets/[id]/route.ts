import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eliminarDeCloudinary } from "@/lib/cloudinary";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const set = await prisma.producto.findUnique({
    where: { id },
    select: { tiendaId: true, esSet: true },
  });

  if (!set || set.tiendaId !== tienda.id || !set.esSet) {
    return NextResponse.json({ error: "Set no encontrado" }, { status: 404 });
  }

  const imagenes = await prisma.productoImagen.findMany({
    where: { productoId: id },
    select: { url: true },
  });

  await prisma.$transaction(async (tx) => {
    // Solo borra los vínculos del set, NO las variantes (son de otros productos).
    await tx.setComponente.deleteMany({ where: { setId: id } });
    await tx.productoColeccion.deleteMany({ where: { productoId: id } });
    await tx.productoImagen.deleteMany({ where: { productoId: id } });
    await tx.producto.delete({ where: { id } });
  });

  await Promise.all(imagenes.map((imagen) => eliminarDeCloudinary(imagen.url)));

  return NextResponse.json({ ok: true });
}
