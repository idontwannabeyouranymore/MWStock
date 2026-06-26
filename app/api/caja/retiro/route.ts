import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

export async function POST(request: Request) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rol = await obtenerRol();
  if (rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo el administrador puede retirar efectivo" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const monto = Number(body.monto);

  if (Number.isNaN(monto) || monto <= 0) {
    return NextResponse.json(
      { error: "El monto debe ser mayor a 0" },
      { status: 400 }
    );
  }

  const retiro = await prisma.retiroCaja.create({
    data: {
      tiendaId: tienda.id,
      monto,
      nota: body.nota ? String(body.nota).trim() || null : null,
    },
  });

  return NextResponse.json({ ok: true, id: retiro.id });
}
