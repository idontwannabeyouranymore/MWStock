import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      include: {
        colecciones: {
          include: {
            coleccion: true,
          },
        },
        imagenes: true,
        variantes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(productos);
  } catch (error) {
    console.error("GET /api/productos", error);

    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      nombre,
      descripcion,
      marca,
      precio,
      tiendaId,
      coleccionIds,
    } = body;

    if (!nombre || !precio || !tiendaId) {
      return NextResponse.json(
        { error: "Nombre, precio y tiendaId son obligatorios" },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.create({
      data: {
        nombre,
        descripcion,
        marca,
        precio,
        tiendaId,
        colecciones: {
          create: coleccionIds?.map((coleccionId: string) => ({
            coleccionId,
          })),
        },
      },
      include: {
        colecciones: {
          include: {
            coleccion: true,
          },
        },
      },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error("POST /api/productos", error);

    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}