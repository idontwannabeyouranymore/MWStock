import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();

    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const productos = await prisma.producto.findMany({
      where: { tiendaId: tienda.id },
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
    const tienda = await obtenerTiendaDeSesion();

    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const { nombre, descripcion, marca, precio, coleccionIds } = body;

    if (!nombre || !precio) {
      return NextResponse.json(
        { error: "Nombre y precio son obligatorios" },
        { status: 400 }
      );
    }

    // Seguridad: solo permitimos vincular colecciones que sean de ESTA tienda.
    let coleccionesValidas: string[] = [];

    if (Array.isArray(coleccionIds) && coleccionIds.length > 0) {
      const propias = await prisma.coleccion.findMany({
        where: { id: { in: coleccionIds }, tiendaId: tienda.id },
        select: { id: true },
      });
      coleccionesValidas = propias.map((c) => c.id);
    }

    const producto = await prisma.producto.create({
      data: {
        nombre,
        descripcion,
        marca,
        precio,
        tiendaId: tienda.id,
        colecciones: {
          create: coleccionesValidas.map((coleccionId) => ({
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
        imagenes: true,
        variantes: true,
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
