import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const stock =
      body.stock !== undefined ? Number(body.stock) : undefined;

    if (stock !== undefined && stock < 0) {
      return NextResponse.json(
        { error: "El stock no puede ser negativo" },
        { status: 400 }
      );
    }

    const variante = await prisma.variante.update({
      where: { id },
      data: {
        talla: body.talla,
        color: body.color,
        stock,
        estado:
          stock !== undefined
            ? stock > 0
              ? "ACTIVA"
              : "AGOTADA"
            : body.estado,
      },
      include: {
        producto: true,
      },
    });

    return NextResponse.json(variante);
  } catch (error) {
    console.error("PATCH /api/variantes/[id]", error);

    return NextResponse.json(
      { error: "Error al actualizar variante" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const variante = await prisma.variante.update({
      where: { id },
      data: {
        estado: "ARCHIVADA",
      },
    });

    return NextResponse.json(variante);
  } catch (error) {
    console.error("DELETE /api/variantes/[id]", error);

    return NextResponse.json(
      { error: "Error al archivar variante" },
      { status: 500 }
    );
  }
}