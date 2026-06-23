import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esDueno } from "@/lib/auth";
import { MODULOS, normalizarModulos } from "@/lib/modulos";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Suspender/reactivar una tienda y/o prender-apagar sus herramientas (módulos).
export async function PATCH(request: Request, context: RouteContext) {
  if (!(await esDueno())) {
    return NextResponse.json({ error: "Solo el dueño" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const existe = await prisma.tienda.findUnique({ where: { id } });
  if (!existe) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  const data: { activa?: boolean; modulos?: Record<string, boolean> } = {};

  if (typeof body.activa === "boolean") {
    data.activa = body.activa;
  }

  // Acepta un objeto parcial { clave: boolean } y lo combina con lo guardado.
  if (body.modulos && typeof body.modulos === "object") {
    const actuales = normalizarModulos(existe.modulos);
    const clavesValidas = MODULOS.map((m) => m.clave);
    for (const [clave, valor] of Object.entries(body.modulos)) {
      if (clavesValidas.includes(clave as never) && typeof valor === "boolean") {
        actuales[clave as keyof typeof actuales] = valor;
      }
    }
    data.modulos = actuales;
  }

  if (data.activa === undefined && data.modulos === undefined) {
    return NextResponse.json(
      { error: "Nada que actualizar (envía 'activa' o 'modulos')" },
      { status: 400 }
    );
  }

  const tienda = await prisma.tienda.update({ where: { id }, data });
  return NextResponse.json(tienda);
}

// Eliminar una tienda con TODOS sus datos y su usuario admin. No borra al dueño.
export async function DELETE(_request: Request, context: RouteContext) {
  if (!(await esDueno())) {
    return NextResponse.json({ error: "Solo el dueño" }, { status: 403 });
  }

  const { id } = await context.params;
  const tienda = await prisma.tienda.findUnique({
    where: { id },
    include: { usuario: { select: { id: true, rol: true } } },
  });

  if (!tienda) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }
  if (tienda.usuario?.rol === "DUENO") {
    return NextResponse.json(
      { error: "No se puede eliminar la tienda del dueño" },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.ventaItem.deleteMany({ where: { venta: { tiendaId: id } } });
    await tx.venta.deleteMany({ where: { tiendaId: id } });
    await tx.abono.deleteMany({ where: { deuda: { tiendaId: id } } });
    await tx.deuda.deleteMany({ where: { tiendaId: id } });
    await tx.tandaPago.deleteMany({
      where: { periodo: { tanda: { tiendaId: id } } },
    });
    await tx.tandaPeriodo.deleteMany({ where: { tanda: { tiendaId: id } } });
    await tx.tandaParticipante.deleteMany({ where: { tanda: { tiendaId: id } } });
    await tx.tanda.deleteMany({ where: { tiendaId: id } });
    await tx.movimientoInventario.deleteMany({
      where: { variante: { producto: { tiendaId: id } } },
    });
    await tx.setComponente.deleteMany({ where: { set: { tiendaId: id } } });
    await tx.productoImagen.deleteMany({ where: { producto: { tiendaId: id } } });
    await tx.productoColeccion.deleteMany({
      where: { producto: { tiendaId: id } },
    });
    await tx.variante.deleteMany({ where: { producto: { tiendaId: id } } });
    await tx.producto.deleteMany({ where: { tiendaId: id } });
    await tx.cliente.deleteMany({ where: { tiendaId: id } });
    await tx.coleccion.deleteMany({ where: { tiendaId: id } });
    await tx.tienda.delete({ where: { id } });
    if (tienda.usuario) {
      await tx.usuario.delete({ where: { id: tienda.usuario.id } });
    }
  });

  return NextResponse.json({ ok: true });
}
