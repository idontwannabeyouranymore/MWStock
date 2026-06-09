import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TIENDA_ID = "cmq67l6zl0002vw3os7n7qe30";

export async function GET() {
  try {
    const tienda = await prisma.tienda.findUnique({
      where: {
        id: TIENDA_ID,
      },
    });

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
    const body = await request.json();

    const tienda = await prisma.tienda.update({
      where: {
        id: TIENDA_ID,
      },
      data: {
  nombre: body.nombre,
  descripcion: body.descripcion,
  whatsapp: body.whatsapp,
  instagram: body.instagram,
  direccion: body.direccion,
  logoUrl: body.logoUrl,
  bannerUrl: body.bannerUrl,
  colorTema: body.colorTema,
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