import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const colecciones = await prisma.coleccion.findMany({
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
    const body = await request.json();

    const { nombre, descripcion, tiendaId } = body;

    if (!nombre || !tiendaId) {
      return NextResponse.json(
        { error: "Nombre y tiendaId son obligatorios" },
        { status: 400 }
      );
    }

    const coleccion = await prisma.coleccion.create({
      data: {
        nombre,
        descripcion,
        tiendaId,
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