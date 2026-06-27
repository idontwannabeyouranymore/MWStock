import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

// Inicio del día / del mes en horario de México (UTC-6), expresado en UTC.
function inicioDiaMx(): Date {
  const ahora = new Date();
  const mx = new Date(ahora.getTime() - 6 * 3600 * 1000);
  mx.setUTCHours(0, 0, 0, 0);
  return new Date(mx.getTime() + 6 * 3600 * 1000);
}
function inicioMesMx(): Date {
  const ahora = new Date();
  const mx = new Date(ahora.getTime() - 6 * 3600 * 1000);
  mx.setUTCDate(1);
  mx.setUTCHours(0, 0, 0, 0);
  return new Date(mx.getTime() + 6 * 3600 * 1000);
}

export async function GET() {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if ((await obtenerRol()) !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  }

  const ventas = await prisma.venta.findMany({
    where: { tiendaId: tienda.id },
    select: {
      vendedorId: true,
      vendedorNombre: true,
      total: true,
      createdAt: true,
    },
  });

  const inicioDia = inicioDiaMx();
  const inicioMes = inicioMesMx();

  type Acum = {
    vendedor: string;
    hoy: { monto: number; ventas: number };
    mes: { monto: number; ventas: number };
    total: { monto: number; ventas: number };
  };
  const mapa = new Map<string, Acum>();

  for (const v of ventas) {
    const nombre = v.vendedorNombre || "Sin asignar";
    const key = v.vendedorId || nombre;
    if (!mapa.has(key)) {
      mapa.set(key, {
        vendedor: nombre,
        hoy: { monto: 0, ventas: 0 },
        mes: { monto: 0, ventas: 0 },
        total: { monto: 0, ventas: 0 },
      });
    }
    const a = mapa.get(key)!;
    const monto = Number(v.total);
    a.total.monto += monto;
    a.total.ventas += 1;
    if (v.createdAt >= inicioMes) {
      a.mes.monto += monto;
      a.mes.ventas += 1;
    }
    if (v.createdAt >= inicioDia) {
      a.hoy.monto += monto;
      a.hoy.ventas += 1;
    }
  }

  const lista = [...mapa.values()].sort((a, b) => b.mes.monto - a.mes.monto);
  return NextResponse.json(lista);
}
