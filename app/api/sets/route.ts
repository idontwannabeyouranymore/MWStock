import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

export async function GET() {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sets = await prisma.producto.findMany({
    where: { tiendaId: tienda.id, esSet: true, estado: { not: "ARCHIVADO" } },
    include: {
      imagenes: true,
      colecciones: { include: { coleccion: true } },
      componentes: {
        include: { variante: { include: { producto: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(sets);
}

export async function POST(request: Request) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { nombre, precio, coleccionIds, componentes } = body;

  if (!nombre || !precio) {
    return NextResponse.json(
      { error: "Nombre y precio del set son obligatorios" },
      { status: 400 }
    );
  }

  if (!Array.isArray(componentes) || componentes.length === 0) {
    return NextResponse.json(
      { error: "Agrega al menos un componente al set" },
      { status: 400 }
    );
  }

  // Solo se permiten variantes (decants) de ESTA tienda.
  const ids = componentes.map((c: { varianteId: string }) => c.varianteId);
  const propias = await prisma.variante.findMany({
    where: { id: { in: ids }, producto: { tiendaId: tienda.id } },
    select: { id: true },
  });
  const validas = new Set(propias.map((v) => v.id));
  const compValidos = componentes.filter(
    (c: { varianteId: string }) => validas.has(c.varianteId)
  );

  if (compValidos.length === 0) {
    return NextResponse.json(
      { error: "Los componentes no son válidos" },
      { status: 400 }
    );
  }

  let coleccionesValidas: string[] = [];
  if (Array.isArray(coleccionIds) && coleccionIds.length > 0) {
    const cols = await prisma.coleccion.findMany({
      where: { id: { in: coleccionIds }, tiendaId: tienda.id },
      select: { id: true },
    });
    coleccionesValidas = cols.map((c) => c.id);
  }

  const set = await prisma.producto.create({
    data: {
      nombre,
      precio,
      esSet: true,
      tiendaId: tienda.id,
      colecciones: {
        create: coleccionesValidas.map((coleccionId) => ({ coleccionId })),
      },
      componentes: {
        create: compValidos.map(
          (c: { varianteId: string; cantidad?: number }) => ({
            varianteId: c.varianteId,
            cantidad: c.cantidad && c.cantidad > 0 ? c.cantidad : 1,
          })
        ),
      },
    },
  });

  return NextResponse.json(set, { status: 201 });
}
