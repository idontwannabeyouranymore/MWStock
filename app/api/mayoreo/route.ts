import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";
import { normalizarNiveles } from "@/lib/mayoreo";

export async function GET() {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const mayoreos = await prisma.mayoreo.findMany({
    where: { tiendaId: tienda.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(mayoreos);
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
  const alcance = body.alcance;
  const niveles = normalizarNiveles(body.niveles);

  if (!["COLECCION", "MARCA"].includes(alcance)) {
    return NextResponse.json({ error: "Alcance inválido" }, { status: 400 });
  }
  if (niveles.length === 0) {
    return NextResponse.json(
      { error: "Agrega al menos un nivel de precio válido" },
      { status: 400 }
    );
  }

  let coleccionId: string | null = null;
  let marca: string | null = null;

  if (alcance === "COLECCION") {
    coleccionId = body.coleccionId || null;
    if (!coleccionId) {
      return NextResponse.json({ error: "Elige la colección" }, { status: 400 });
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
  } else {
    marca = String(body.marca || "").trim() || null;
    if (!marca) {
      return NextResponse.json({ error: "Escribe la marca" }, { status: 400 });
    }
  }

  const mayoreo = await prisma.mayoreo.create({
    data: {
      alcance,
      coleccionId,
      marca,
      niveles,
      tiendaId: tienda.id,
    },
  });
  return NextResponse.json(mayoreo, { status: 201 });
}
