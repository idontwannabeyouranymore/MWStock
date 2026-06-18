import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

// POST: registrar una deuda manual (fiado fuera del POS).
export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const clienteId = body.clienteId;
    const concepto = body.concepto?.trim();
    const monto = Number(body.monto);

    if (!clienteId || !concepto) {
      return NextResponse.json(
        { error: "Falta el cliente o el concepto" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { error: "El monto debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    });
    if (!cliente || cliente.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const deuda = await prisma.deuda.create({
      data: {
        concepto,
        monto,
        saldo: monto,
        estado: "PENDIENTE",
        tiendaId: tienda.id,
        clienteId,
      },
    });

    return NextResponse.json(deuda, { status: 201 });
  } catch (error) {
    console.error("POST /api/deudas", error);
    return NextResponse.json(
      { error: "Error al registrar la deuda" },
      { status: 500 }
    );
  }
}
