import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const variantes = await prisma.variante.findMany({
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