import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";
import { normalizarPersonalizacion } from "@/lib/personalizacion";

export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();

    if (!tienda) {
      return NextResponse.json(
        { error: "Tienda no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(tienda);
  } catch (error) {
    console.error("GET /api/tienda", error);

    return NextResponse.json(
      { error: "Error al obtener tienda" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const tiendaActual = await obtenerTiendaDeSesion();

    if (!tiendaActual) {
      return NextResponse.json(
        { error: "Tienda no encontrada" },
        { status: 404 }
      );
    }

    if ((await obtenerRol()) !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo el administrador puede editar la tienda" },
        { status: 403 }
      );
    }

    const body = await request.json();

    const tienda = await prisma.tienda.update({
      where: { id: tiendaActual.id },
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        whatsapp: body.whatsapp,
        instagram: body.instagram,
        direccion: body.direccion,
        logoUrl: body.logoUrl,
        bannerUrl: body.bannerUrl,
        colorTema: body.colorTema,
        ...(body.estiloCatalogo !== undefined && {
          estiloCatalogo: body.estiloCatalogo,
        }),
        ...(body.personalizacion !== undefined && {
          personalizacion: normalizarPersonalizacion(body.personalizacion),
        }),
      },
    });

    return NextResponse.json(tienda);
  } catch (error) {
    console.error("PATCH /api/tienda", error);

    return NextResponse.json(
      { error: "Error al actualizar tienda" },
      { status: 500 }
    );
  }
}
