// Arma un resumen REAL de la tienda para que la IA solo lo explique (no invente).

import { prisma } from "@/lib/prisma";

const num = (v: unknown) => Number(v ?? 0);

export async function resumenTienda(tiendaId: string) {
  const ahora = new Date();
  const hoy0 = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const hace7 = new Date(ahora.getTime() - 7 * 24 * 3600 * 1000);
  const mes0 = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const hace90 = new Date(ahora.getTime() - 90 * 24 * 3600 * 1000);

  const [ventas90, totalHist, topItems, variantes, totalProductos, agotados] =
    await Promise.all([
      prisma.venta.findMany({
        where: { tiendaId, createdAt: { gte: hace90 } },
        select: { total: true, metodoPago: true, montoRecibido: true, createdAt: true },
      }),
      prisma.venta.aggregate({
        where: { tiendaId },
        _count: true,
        _sum: { total: true },
      }),
      prisma.ventaItem.groupBy({
        by: ["productoNombre"],
        where: { venta: { tiendaId, createdAt: { gte: mes0 } } },
        _sum: { cantidad: true, subtotal: true },
        orderBy: { _sum: { cantidad: "desc" } },
        take: 5,
      }),
      prisma.variante.findMany({
        where: { producto: { tiendaId }, estado: { not: "ARCHIVADA" } },
        select: {
          stock: true,
          talla: true,
          precio: true,
          producto: { select: { nombre: true, precio: true } },
        },
      }),
      prisma.producto.count({
        where: { tiendaId, estado: { not: "ARCHIVADO" } },
      }),
      prisma.producto.count({ where: { tiendaId, estado: "AGOTADO" } }),
    ]);

  const agg = (lista: { total: unknown }[]) => ({
    ventas: lista.length,
    dinero: Number(
      lista.reduce((s, v) => s + num(v.total), 0).toFixed(2)
    ),
  });

  const hoy = agg(ventas90.filter((v) => v.createdAt >= hoy0));
  const semana = agg(ventas90.filter((v) => v.createdAt >= hace7));
  const mes = agg(ventas90.filter((v) => v.createdAt >= mes0));

  const porMetodo: Record<string, number> = {
    EFECTIVO: 0,
    TARJETA: 0,
    TRANSFERENCIA: 0,
  };
  for (const v of ventas90) {
    if (v.createdAt >= mes0) {
      porMetodo[v.metodoPago] = (porMetodo[v.metodoPago] ?? 0) + num(v.total);
    }
  }

  const piezas = variantes.reduce((s, v) => s + v.stock, 0);
  const valorInventario = Number(
    variantes
      .reduce((s, v) => s + v.stock * num(v.precio ?? v.producto.precio), 0)
      .toFixed(2)
  );
  const stockBajo = variantes
    .filter((v) => v.stock <= 3)
    .slice(0, 15)
    .map((v) => ({
      producto: v.producto.nombre,
      presentacion: v.talla,
      stock: v.stock,
    }));

  return {
    fecha: ahora.toISOString().slice(0, 10),
    ventas: {
      hoy,
      ultimos7dias: semana,
      esteMes: mes,
      historicoTotal: {
        ventas: totalHist._count,
        dinero: num(totalHist._sum.total),
      },
      porMetodoEsteMes: porMetodo,
    },
    topProductosDelMes: topItems.map((t) => ({
      nombre: t.productoNombre,
      vendidos: num(t._sum.cantidad),
      ingresos: num(t._sum.subtotal),
    })),
    inventario: {
      productos: totalProductos,
      agotados,
      piezasEnStock: piezas,
      valorInventario,
      stockBajo,
    },
  };
}
