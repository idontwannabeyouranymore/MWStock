import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const movimientos = await prisma.movimientoInventario.findMany({
      include: {
        variante: {
          include: {
            producto: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(movimientos);
  } catch (error) {
    console.error("GET /api/inventario/historial", error);

    return NextResponse.json(
      { error: "Error al obtener historial" },
      { status: 500 }
    );
  }
}