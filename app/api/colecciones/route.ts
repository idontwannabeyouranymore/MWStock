import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();

    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const colecciones = await prisma.coleccion.findMany({
      where: { tiendaId: tienda.id },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(colecciones);
  } catch (error) {
    console.error("GET /api/colecciones", error);

    return NextResponse.json(
      { error: "Error al obtener colecciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();

    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const { nombre, descripcion } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const coleccion = await prisma.coleccion.create({
      data: {
        nombre,
        descripcion,
        tiendaId: tienda.id,
      },
    });

    return NextResponse.json(coleccion, { status: 201 });
  } catch (error) {
    console.error("POST /api/colecciones", error);

    return NextResponse.json(
      { error: "Error al crear colección" },
      { status: 500 }
    );
  }
}
