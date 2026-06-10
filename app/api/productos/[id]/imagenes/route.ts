import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

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

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();

  const imagen = await prisma.productoImagen.create({
    data: {
      productoId: id,
      url: body.url,
      orden: body.orden ?? 0,
    },
  });

  return NextResponse.json(imagen);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  await prisma.productoImagen.deleteMany({
    where: {
      productoId: id,
    },
  });

  return NextResponse.json({ ok: true });
}