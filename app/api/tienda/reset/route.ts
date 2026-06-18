import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

// POST: borra TODO el catálogo e historial de la tienda (deja la cuenta intacta).
// Requiere { confirmacion: "BORRAR" } en el cuerpo.
export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirmacion !== "BORRAR") {
      return NextResponse.json(
        { error: "Confirmación incorrecta" },
        { status: 400 }
      );
    }

    const tiendaId = tienda.id;

    await prisma.$transaction(async (tx) => {
      // Ventas e items
      await tx.ventaItem.deleteMany({ where: { venta: { tiendaId } } });
      await tx.venta.deleteMany({ where: { tiendaId } });

      // Fiado
      await tx.abono.deleteMany({ where: { deuda: { tiendaId } } });
      await tx.deuda.deleteMany({ where: { tiendaId } });

      // Tandas
      await tx.tandaPago.deleteMany({
        where: { periodo: { tanda: { tiendaId } } },
      });
      await tx.tandaPeriodo.deleteMany({ where: { tanda: { tiendaId } } });
      await tx.tandaParticipante.deleteMany({ where: { tanda: { tiendaId } } });
      await tx.tanda.deleteMany({ where: { tiendaId } });

      // Inventario / catálogo
      await tx.movimientoInventario.deleteMany({
        where: { variante: { producto: { tiendaId } } },
      });
      await tx.setComponente.deleteMany({ where: { set: { tiendaId } } });
      await tx.productoImagen.deleteMany({
        where: { producto: { tiendaId } },
      });
      await tx.productoColeccion.deleteMany({
        where: { producto: { tiendaId } },
      });
      await tx.variante.deleteMany({ where: { producto: { tiendaId } } });
      await tx.producto.deleteMany({ where: { tiendaId } });

      // Clientes y colecciones
      await tx.cliente.deleteMany({ where: { tiendaId } });
      await tx.coleccion.deleteMany({ where: { tiendaId } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/tienda/reset", error);
    return NextResponse.json(
      { error: "Error al borrar los datos" },
      { status: 500 }
    );
  }
}
