import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET: detalle del cliente con sus deudas (y abonos) y compras.
export async function GET(_request: Request, { params }: Params) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        deudas: {
          include: {
            abonos: { orderBy: { createdAt: "desc" } },
            venta: { select: { id: true, createdAt: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!cliente || cliente.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const saldoTotal = cliente.deudas.reduce(
      (s, d) => s + Number(d.saldo),
      0
    );

    return NextResponse.json({ ...cliente, saldoTotal });
  } catch (error) {
    console.error("GET /api/clientes/[id]", error);
    return NextResponse.json(
      { error: "Error al obtener el cliente" },
      { status: 500 }
    );
  }
}

// PATCH: editar datos del cliente.
export async function PATCH(request: Request, { params }: Params) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente || cliente.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const actualizado = await prisma.cliente.update({
      where: { id },
      data: {
        nombre: body.nombre?.trim() || cliente.nombre,
        telefono:
          body.telefono !== undefined
            ? body.telefono?.trim() || null
            : cliente.telefono,
        nota:
          body.nota !== undefined ? body.nota?.trim() || null : cliente.nota,
      },
    });

    return NextResponse.json(actualizado);
  } catch (error) {
    console.error("PATCH /api/clientes/[id]", error);
    return NextResponse.json(
      { error: "Error al actualizar el cliente" },
      { status: 500 }
    );
  }
}

// DELETE: eliminar cliente (solo si no tiene saldo pendiente).
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: { deudas: { include: { abonos: true } } },
    });
    if (!cliente || cliente.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const saldoTotal = cliente.deudas.reduce((s, d) => s + Number(d.saldo), 0);
    if (saldoTotal > 0) {
      return NextResponse.json(
        { error: "No puedes borrar un cliente con saldo pendiente" },
        { status: 400 }
      );
    }

    // Borra abonos y deudas del cliente, luego el cliente.
    await prisma.$transaction(async (tx) => {
      for (const deuda of cliente.deudas) {
        await tx.abono.deleteMany({ where: { deudaId: deuda.id } });
      }
      await tx.deuda.deleteMany({ where: { clienteId: id } });
      await tx.cliente.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/clientes/[id]", error);
    return NextResponse.json(
      { error: "Error al borrar el cliente" },
      { status: 500 }
    );
  }
}
