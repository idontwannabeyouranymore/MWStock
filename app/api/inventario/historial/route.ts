import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();

    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const movimientos = await prisma.movimientoInventario.findMany({
      where: { variante: { producto: { tiendaId: tienda.id } } },
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
