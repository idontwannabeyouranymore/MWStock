import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type TipoMovimiento =
  | "ENTRADA"
  | "SALIDA"
  | "AJUSTE"
  | "VENTA"
  | "APARTADO"
  | "DANADO";

export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();

    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    const {
      varianteId,
      tipo,
      cantidad,
      nota,
    }: {
      varianteId: string;
      tipo: TipoMovimiento;
      cantidad: number;
      nota?: string;
    } = body;

    if (!varianteId || !tipo || !cantidad) {
      return NextResponse.json(
        { error: "varianteId, tipo y cantidad son obligatorios" },
        { status: 400 }
      );
    }

    if (cantidad <= 0) {
      return NextResponse.json(
        { error: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const varianteActual = await prisma.variante.findUnique({
      where: { id: varianteId },
      include: { producto: true },
    });

    if (!varianteActual || varianteActual.producto.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Variante no encontrada" },
        { status: 404 }
      );
    }

    const stockAnterior = varianteActual.stock;

    let stockNuevo = stockAnterior;

    if (tipo === "ENTRADA") {
      stockNuevo = stockAnterior + cantidad;
    }

    if (
      tipo === "SALIDA" ||
      tipo === "VENTA" ||
      tipo === "APARTADO" ||
      tipo === "DANADO"
    ) {
      stockNuevo = stockAnterior - cantidad;
    }

    if (tipo === "AJUSTE") {
      stockNuevo = cantidad;
    }

    if (stockNuevo < 0) {
      return NextResponse.json(
        { error: "No hay stock suficiente" },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const varianteActualizada = await tx.variante.update({
        where: { id: varianteId },
        data: {
          stock: stockNuevo,
          estado: stockNuevo > 0 ? "ACTIVA" : "AGOTADA",
        },
        include: { producto: true },
      });

      const movimiento = await tx.movimientoInventario.create({
        data: {
          varianteId,
          tipo,
          cantidad,
          stockAnterior,
          stockNuevo,
          nota,
        },
      });

      const variantesProducto = await tx.variante.findMany({
        where: {
          productoId: varianteActual.productoId,
          estado: { not: "ARCHIVADA" },
        },
      });

      const hayStock = variantesProducto.some((variante) => variante.stock > 0);

      await tx.producto.update({
        where: { id: varianteActual.productoId },
        data: { estado: hayStock ? "ACTIVO" : "AGOTADO" },
      });

      return { variante: varianteActualizada, movimiento };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error("POST /api/inventario/movimiento", error);

    return NextResponse.json(
      { error: "Error al registrar movimiento de inventario" },
      { status: 500 }
    );
  }
}
