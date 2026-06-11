import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();

    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const variantes = await prisma.variante.findMany({
      where: { producto: { tiendaId: tienda.id } },
      include: {
        producto: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(variantes);
  } catch (error) {
    console.error("GET /api/variantes", error);

    return NextResponse.json(
      { error: "Error al obtener variantes" },
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

    const { productoId, talla, color, stock } = body;

    if (!productoId || !talla) {
      return NextResponse.json(
        { error: "Producto y talla son obligatorios" },
        { status: 400 }
      );
    }

    if (stock < 0) {
      return NextResponse.json(
        { error: "El stock no puede ser negativo" },
        { status: 400 }
      );
    }

    // El producto debe pertenecer a la tienda de la sesión.
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { tiendaId: true },
    });

    if (!producto || producto.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 }
      );
    }

    const variante = await prisma.variante.create({
      data: {
        productoId,
        talla,
        color,
        stock: Number(stock),
        estado: Number(stock) > 0 ? "ACTIVA" : "AGOTADA",
      },
      include: {
        producto: true,
      },
    });

    return NextResponse.json(variante, { status: 201 });
  } catch (error) {
    console.error("POST /api/variantes", error);

    return NextResponse.json(
      { error: "Error al crear variante" },
      { status: 500 }
    );
  }
}
