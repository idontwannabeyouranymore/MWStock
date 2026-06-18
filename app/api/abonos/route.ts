import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

// GET: lista de abonos de la tienda (para cortes y reportes).
export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const abonos = await prisma.abono.findMany({
      where: { deuda: { tiendaId: tienda.id } },
      include: {
        deuda: { include: { cliente: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = abonos.map((a) => ({
      id: a.id,
      monto: a.monto,
      nota: a.nota,
      createdAt: a.createdAt,
      clienteNombre: a.deuda.cliente.nombre,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/abonos", error);
    return NextResponse.json(
      { error: "Error al obtener abonos" },
      { status: 500 }
    );
  }
}

// POST: registrar un abono a una deuda. Reduce el saldo y marca PAGADA si llega a 0.
export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const deudaId = body.deudaId;
    const monto = Number(body.monto);
    const nota = body.nota?.trim() || null;

    if (!deudaId) {
      return NextResponse.json({ error: "Falta la deuda" }, { status: 400 });
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      return NextResponse.json(
        { error: "El abono debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const deuda = await tx.deuda.findUnique({ where: { id: deudaId } });
      if (!deuda || deuda.tiendaId !== tienda.id) {
        throw new Error("Deuda no encontrada");
      }

      const saldoActual = Number(deuda.saldo);
      if (saldoActual <= 0) {
        throw new Error("Esta deuda ya está pagada");
      }

      // No se permite abonar más que el saldo: se ajusta al saldo restante.
      const montoAplicado = Math.min(monto, saldoActual);
      const saldoNuevo = Number((saldoActual - montoAplicado).toFixed(2));

      await tx.abono.create({
        data: { monto: montoAplicado, nota, deudaId },
      });

      const actualizada = await tx.deuda.update({
        where: { id: deudaId },
        data: {
          saldo: saldoNuevo,
          estado: saldoNuevo <= 0 ? "PAGADA" : "PENDIENTE",
        },
      });

      return { deuda: actualizada, montoAplicado };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error("POST /api/abonos", error);
    const mensaje =
      error instanceof Error ? error.message : "Error al registrar el abono";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
