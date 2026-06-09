import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params;

    const body = await request.json();

    const imagen = await prisma.productoImagen.create({
      data: {
        productoId: id,
        url: body.url,
        orden: body.orden ?? 0,
      },
    });

    return NextResponse.json(imagen);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Error al guardar imagen" },
      { status: 500 }
    );
  }
}
export async function GET(
  request: NextRequest,
  { params }: Params
) {
  const { id } = await params;

  const imagenes = await prisma.productoImagen.findMany({
    where: {
      productoId: id,
    },
    orderBy: {
      orden: "asc",
    },
  });

  return NextResponse.json(imagenes);
}