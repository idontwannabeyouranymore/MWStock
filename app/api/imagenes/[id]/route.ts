import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eliminarDeCloudinary } from "@/lib/cloudinary";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Borra UNA imagen concreta (registro en BD + archivo en Cloudinary).
export async function DELETE(_request: Request, context: RouteContext) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await context.params;

  const imagen = await prisma.productoImagen.findUnique({
    where: { id },
    include: { producto: { select: { tiendaId: true } } },
  });

  if (!imagen || imagen.producto.tiendaId !== tienda.id) {
    return NextResponse.json(
      { error: "Imagen no encontrada" },
      { status: 404 }
    );
  }

  await prisma.productoImagen.delete({ where: { id } });

  await eliminarDeCloudinary(imagen.url);

  return NextResponse.json({ ok: true });
}
