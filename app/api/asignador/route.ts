import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion, obtenerRol } from "@/lib/auth";

// Asigna presentaciones (tallas) a TODOS los productos de una colección.
// modo "agregar": solo crea las tallas que falten en cada producto.
// modo "actualizar": además actualiza stock/precio de las tallas que ya existen.
export async function POST(request: Request) {
  const tienda = await obtenerTiendaDeSesion();
  if (!tienda) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if ((await obtenerRol()) !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador" }, { status: 403 });
  }

  const body = await request.json();
  const coleccionId = body.coleccionId;
  const modo = body.modo === "actualizar" ? "actualizar" : "agregar";

  const tallas = (Array.isArray(body.tallas) ? body.tallas : [])
    .map((t: { talla?: unknown; stock?: unknown; precio?: unknown }) => ({
      talla: String(t.talla ?? "").trim(),
      stock: Math.max(0, Math.floor(Number(t.stock) || 0)),
      precio:
        t.precio === "" || t.precio == null || Number.isNaN(Number(t.precio))
          ? null
          : Number(t.precio),
    }))
    .filter((t: { talla: string }) => t.talla !== "");

  if (!coleccionId) {
    return NextResponse.json({ error: "Elige una colección" }, { status: 400 });
  }
  if (tallas.length === 0) {
    return NextResponse.json(
      { error: "Agrega al menos una talla" },
      { status: 400 }
    );
  }

  const col = await prisma.coleccion.findFirst({
    where: { id: coleccionId, tiendaId: tienda.id },
    select: { id: true },
  });
  if (!col) {
    return NextResponse.json(
      { error: "Colección no encontrada" },
      { status: 404 }
    );
  }

  const productos = await prisma.producto.findMany({
    where: {
      tiendaId: tienda.id,
      estado: { not: "ARCHIVADO" },
      colecciones: { some: { coleccionId } },
    },
    select: {
      id: true,
      variantes: {
        where: { estado: { not: "ARCHIVADA" } },
        select: { id: true, talla: true },
      },
    },
  });

  if (productos.length === 0) {
    return NextResponse.json(
      { error: "Esta colección no tiene productos" },
      { status: 400 }
    );
  }

  const crear: {
    productoId: string;
    talla: string;
    stock: number;
    precio: number | null;
    estado: "ACTIVA";
  }[] = [];
  let actualizadas = 0;

  const totalStock = tallas.reduce(
    (s: number, t: { stock: number }) => s + t.stock,
    0
  );

  await prisma.$transaction(
    async (tx) => {
      for (const t of tallas) {
        const idsActualizar: string[] = [];
        for (const p of productos) {
          const existentes = p.variantes.filter((v) => v.talla === t.talla);
          if (existentes.length > 0) {
            idsActualizar.push(...existentes.map((v) => v.id));
          } else {
            crear.push({
              productoId: p.id,
              talla: t.talla,
              stock: t.stock,
              precio: t.precio,
              estado: "ACTIVA",
            });
          }
        }
        if (modo === "actualizar" && idsActualizar.length > 0) {
          const r = await tx.variante.updateMany({
            where: { id: { in: idsActualizar } },
            data: {
              stock: t.stock,
              ...(t.precio != null ? { precio: t.precio } : {}),
            },
          });
          actualizadas += r.count;
        }
      }

      if (crear.length > 0) {
        await tx.variante.createMany({ data: crear });
      }

      // Si asignamos stock, los productos quedan activos.
      if (totalStock > 0) {
        await tx.producto.updateMany({
          where: { id: { in: productos.map((p) => p.id) } },
          data: { estado: "ACTIVO" },
        });
      }
    },
    { maxWait: 15000, timeout: 60000 }
  );

  return NextResponse.json({
    ok: true,
    productos: productos.length,
    creadas: crear.length,
    actualizadas,
    modo,
  });
}
