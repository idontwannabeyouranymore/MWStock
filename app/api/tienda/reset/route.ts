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

      // Caja
      await tx.retiroCaja.deleteMany({ where: { tiendaId } });

      // Inventario / catálogo
      await tx.movimientoInventario.deleteMany({
        where: { variante: { producto: { tiendaId } } },
      });
      await tx.productoImagen.deleteMany({
        where: { producto: { tiendaId } },
      });
      await tx.productoColeccion.deleteMany({
        where: { producto: { tiendaId } },
      });
      await tx.variante.deleteMany({ where: { producto: { tiendaId } } });
      await tx.producto.deleteMany({ where: { tiendaId } });

      // Colecciones
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
