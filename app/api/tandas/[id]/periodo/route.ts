import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function recalcularEstadoProducto(
  tx: Prisma.TransactionClient,
  productoId: string
) {
  const variantes = await tx.variante.findMany({
    where: { productoId, estado: { not: "ARCHIVADA" } },
  });
  const hayStock = variantes.some((v) => v.stock > 0);
  await tx.producto.update({
    where: { id: productoId },
    data: { estado: hayStock ? "ACTIVO" : "AGOTADO" },
  });
}

// PATCH: asignar el perfume del periodo y/o marcarlo como entregado.
// Al entregar con una presentación, descuenta 1 de stock. Al revertir, lo regresa.
export async function PATCH(request: Request, { params }: Params) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const periodoId = body.periodoId;
    if (!periodoId) {
      return NextResponse.json(
        { error: "Falta el periodo" },
        { status: 400 }
      );
    }

    const periodo = await prisma.tandaPeriodo.findUnique({
      where: { id: periodoId },
      include: { tanda: { select: { id: true, tiendaId: true } } },
    });
    if (
      !periodo ||
      periodo.tandaId !== id ||
      periodo.tanda.tiendaId !== tienda.id
    ) {
      return NextResponse.json(
        { error: "Periodo no encontrado" },
        { status: 404 }
      );
    }

    let newProductoId = periodo.productoId;
    let newVarianteId = periodo.varianteId;
    if ("varianteId" in body) newVarianteId = body.varianteId || null;
    if ("productoId" in body) newProductoId = body.productoId || null;

    // Validación de la presentación/perfume elegidos.
    if (newVarianteId) {
      const v = await prisma.variante.findUnique({
        where: { id: newVarianteId },
        include: { producto: { select: { id: true, tiendaId: true } } },
      });
      if (!v || v.producto.tiendaId !== tienda.id) {
        return NextResponse.json(
          { error: "Presentación no válida" },
          { status: 400 }
        );
      }
      newProductoId = v.producto.id;
    } else if (newProductoId) {
      const p = await prisma.producto.findUnique({
        where: { id: newProductoId },
      });
      if (!p || p.tiendaId !== tienda.id) {
        return NextResponse.json(
          { error: "Perfume no válido" },
          { status: 400 }
        );
      }
    }

    const newEntregado =
      body.entregado !== undefined
        ? Boolean(body.entregado)
        : periodo.entregado;

    if (newEntregado && !newVarianteId) {
      return NextResponse.json(
        { error: "Asigna una presentación (decant/completo) antes de entregar" },
        { status: 400 }
      );
    }

    const actualizado = await prisma.$transaction(async (tx) => {
      const wasDeducted = periodo.entregado && periodo.varianteId;
      const shouldDeduct = newEntregado && newVarianteId;
      const cambioVariante = periodo.varianteId !== newVarianteId;

      // Reversa del stock anterior si ya no aplica.
      if (wasDeducted && (!shouldDeduct || cambioVariante)) {
        const v = await tx.variante.findUnique({
          where: { id: periodo.varianteId! },
        });
        if (v) {
          const stockNuevo = v.stock + 1;
          await tx.variante.update({
            where: { id: v.id },
            data: {
              stock: stockNuevo,
              estado: stockNuevo > 0 ? "ACTIVA" : v.estado,
            },
          });
          await tx.movimientoInventario.create({
            data: {
              varianteId: v.id,
              tipo: "ENTRADA",
              cantidad: 1,
              stockAnterior: v.stock,
              stockNuevo,
              nota: "Reversa de entrega de tanda",
            },
          });
          await recalcularEstadoProducto(tx, v.productoId);
        }
      }

      // Descuento del stock nuevo.
      if (shouldDeduct && (!wasDeducted || cambioVariante)) {
        const v = await tx.variante.findUnique({
          where: { id: newVarianteId! },
        });
        if (!v) throw new Error("Presentación no encontrada");
        if (v.stock < 1) {
          throw new Error("Sin stock para entregar ese perfume");
        }
        const stockNuevo = v.stock - 1;
        await tx.variante.update({
          where: { id: v.id },
          data: {
            stock: stockNuevo,
            estado: stockNuevo > 0 ? "ACTIVA" : "AGOTADA",
          },
        });
        await tx.movimientoInventario.create({
          data: {
            varianteId: v.id,
            tipo: "VENTA",
            cantidad: 1,
            stockAnterior: v.stock,
            stockNuevo,
            nota: "Entrega de tanda",
          },
        });
        await recalcularEstadoProducto(tx, v.productoId);
      }

      return tx.tandaPeriodo.update({
        where: { id: periodoId },
        data: {
          productoId: newProductoId,
          varianteId: newVarianteId,
          entregado: newEntregado,
        },
      });
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error("PATCH /api/tandas/[id]/periodo", error);
    const mensaje =
      error instanceof Error ? error.message : "Error al actualizar el periodo";
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
}
