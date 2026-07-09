import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

export async function GET() {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const promociones = await prisma.promocion.findMany({
    where: { tiendaId: tienda.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(promociones);
}

export async function POST(request: Request) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if ((await obtenerRol()) !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  }

  const body = await request.json();
  const nombre = String(body.nombre || "").trim();
  const porcentaje = Math.round(Number(body.porcentaje));
  const alcance = body.alcance;
  const inicio = new Date(body.inicio);
  const fin = new Date(body.fin);

  if (!nombre) {
    return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
  }
  if (Number.isNaN(porcentaje) || porcentaje < 1 || porcentaje > 100) {
    return NextResponse.json(
      { error: "El porcentaje debe estar entre 1 y 100" },
      { status: 400 }
    );
  }
  if (!["TIENDA", "COLECCION", "MARCA"].includes(alcance)) {
    return NextResponse.json({ error: "Alcance inválido" }, { status: 400 });
  }
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin < inicio) {
    return NextResponse.json(
      { error: "Fechas inválidas (la fin debe ser posterior al inicio)" },
      { status: 400 }
    );
  }

  let coleccionId: string | null = null;
  let marca: string | null = null;

  if (alcance === "COLECCION") {
    coleccionId = body.coleccionId || null;
    if (!coleccionId) {
      return NextResponse.json(
        { error: "Elige la colección" },
        { status: 400 }
      );
    }
    const col = await prisma.coleccion.findFirst({
      where: { id: coleccionId, tiendaId: tienda.id },
      select: { id: true },
    });
    if (!col) {
      return NextResponse.json(
        { error: "Colección no encontrada" },
        { status: 404 }
      );
    }
  } else if (alcance === "MARCA") {
    marca = String(body.marca || "").trim() || null;
    if (!marca) {
      return NextResponse.json({ error: "Escribe la marca" }, { status: 400 });
    }
  }

  const promo = await prisma.promocion.create({
    data: {
      nombre,
      porcentaje,
      alcance,
      coleccionId,
      marca,
      inicio,
      fin,
      tiendaId: tienda.id,
    },
  });
  return NextResponse.json(promo, { status: 201 });
}
