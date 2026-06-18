import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// PATCH: marcar/desmarcar el pago de un participante en un periodo.
export async function PATCH(request: Request, { params }: Params) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { periodoId, participanteId } = body;
    const pagado = Boolean(body.pagado);

    if (!periodoId || !participanteId) {
      return NextResponse.json(
        { error: "Faltan datos del pago" },
        { status: 400 }
      );
    }

    // Verifica que el periodo pertenezca a una tanda de esta tienda.
    const periodo = await prisma.tandaPeriodo.findUnique({
      where: { id: periodoId },
      include: { tanda: { select: { id: true, tiendaId: true } } },
    });
    if (
      !periodo ||
      periodo.tandaId !== id ||
      periodo.tanda.tiendaId !== tienda.id
    ) {
      return NextResponse.json(
        { error: "Periodo no encontrado" },
        { status: 404 }
      );
    }

    const pago = await prisma.tandaPago.update({
      where: {
        periodoId_participanteId: { periodoId, participanteId },
      },
      data: { pagado, fechaPago: pagado ? new Date() : null },
    });

    return NextResponse.json(pago);
  } catch (error) {
    console.error("PATCH /api/tandas/[id]/pago", error);
    return NextResponse.json(
      { error: "Error al actualizar el pago" },
      { status: 500 }
    );
  }
}
