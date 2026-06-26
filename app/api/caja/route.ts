import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

// Inicio del día en horario de México (UTC-6) expresado en UTC.
function inicioDiaMx(): Date {
  const ahora = new Date();
  const mx = new Date(ahora.getTime() - 6 * 3600 * 1000);
  mx.setUTCHours(0, 0, 0, 0);
  return new Date(mx.getTime() + 6 * 3600 * 1000);
}

async function estadoCaja(tiendaId: string) {
  const tienda = await prisma.tienda.findUnique({
    where: { id: tiendaId },
    select: { fondoCaja: true, umbralCajaPeligro: true },
  });

  const inicio = inicioDiaMx();

  const [ventas, abonos, retirosSum, retiros] = await Promise.all([
    prisma.venta.aggregate({
      _sum: { total: true },
      where: { tiendaId, metodoPago: "EFECTIVO", createdAt: { gte: inicio } },
    }),
    prisma.abono.aggregate({
      _sum: { monto: true },
      where: { createdAt: { gte: inicio }, deuda: { tiendaId } },
    }),
    prisma.retiroCaja.aggregate({
      _sum: { monto: true },
      where: { tiendaId, createdAt: { gte: inicio } },
    }),
    prisma.retiroCaja.findMany({
      where: { tiendaId, createdAt: { gte: inicio } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const fondoCaja = Number(tienda?.fondoCaja ?? 0);
  const umbral =
    tienda?.umbralCajaPeligro != null
      ? Number(tienda.umbralCajaPeligro)
      : null;
  const efectivoVentasHoy = Number(ventas._sum.total ?? 0);
  const abonosHoy = Number(abonos._sum.monto ?? 0);
  const retirosHoy = Number(retirosSum._sum.monto ?? 0);
  const efectivoEnCaja =
    fondoCaja + efectivoVentasHoy + abonosHoy - retirosHoy;
  const peligro = umbral != null && efectivoEnCaja >= umbral;

  return {
    fondoCaja,
    umbralCajaPeligro: umbral,
    efectivoVentasHoy,
    abonosHoy,
    retirosHoy,
    efectivoEnCaja,
    peligro,
    retiros: retiros.map((r) => ({
      id: r.id,
      monto: Number(r.monto),
      nota: r.nota,
      createdAt: r.createdAt,
    })),
  };
}

export async function GET() {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json(await estadoCaja(tienda.id));
}

export async function PATCH(request: Request) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rol = await obtenerRol();
  if (rol !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo el administrador puede cambiar la caja" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const data: { fondoCaja?: number; umbralCajaPeligro?: number | null } = {};

  if (body.fondoCaja !== undefined) {
    const f = Number(body.fondoCaja);
    if (Number.isNaN(f) || f < 0) {
      return NextResponse.json(
        { error: "Fondo inválido" },
        { status: 400 }
      );
    }
    data.fondoCaja = f;
  }

  if (body.umbralCajaPeligro !== undefined) {
    if (body.umbralCajaPeligro === null || body.umbralCajaPeligro === "") {
      data.umbralCajaPeligro = null;
    } else {
      const u = Number(body.umbralCajaPeligro);
      if (Number.isNaN(u) || u < 0) {
        return NextResponse.json(
          { error: "Umbral inválido" },
          { status: 400 }
        );
      }
      data.umbralCajaPeligro = u;
    }
  }

  await prisma.tienda.update({ where: { id: tienda.id }, data });
  return NextResponse.json(await estadoCaja(tienda.id));
}
