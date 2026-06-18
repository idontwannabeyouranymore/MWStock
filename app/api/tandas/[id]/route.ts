import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// GET: detalle completo de la tanda.
export async function GET(_request: Request, { params }: Params) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const tanda = await prisma.tanda.findUnique({
      where: { id },
      include: {
        participantes: {
          orderBy: { turno: "asc" },
          include: {
            cliente: { select: { id: true, nombre: true, telefono: true } },
          },
        },
        periodos: {
          orderBy: { numero: "asc" },
          include: {
            producto: { select: { id: true, nombre: true } },
            variante: { select: { id: true, talla: true } },
            pagos: {
              include: {
                participante: {
                  include: { cliente: { select: { nombre: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!tanda || tanda.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Tanda no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(tanda);
  } catch (error) {
    console.error("GET /api/tandas/[id]", error);
    return NextResponse.json(
      { error: "Error al obtener la tanda" },
      { status: 500 }
    );
  }
}

// PATCH: cambiar estado (ACTIVA / FINALIZADA / CANCELADA) o nombre.
export async function PATCH(request: Request, { params }: Params) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const tanda = await prisma.tanda.findUnique({ where: { id } });
    if (!tanda || tanda.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Tanda no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data: {
      estado?: "ACTIVA" | "FINALIZADA" | "CANCELADA";
      nombre?: string;
    } = {};
    if (
      body.estado &&
      ["ACTIVA", "FINALIZADA", "CANCELADA"].includes(body.estado)
    ) {
      data.estado = body.estado;
    }
    if (body.nombre?.trim()) data.nombre = body.nombre.trim();

    const actualizada = await prisma.tanda.update({
      where: { id },
      data,
    });

    return NextResponse.json(actualizada);
  } catch (error) {
    console.error("PATCH /api/tandas/[id]", error);
    return NextResponse.json(
      { error: "Error al actualizar la tanda" },
      { status: 500 }
    );
  }
}

// DELETE: borra la tanda con sus periodos, pagos y participantes.
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const tanda = await prisma.tanda.findUnique({
      where: { id },
      include: { periodos: { select: { id: true } } },
    });
    if (!tanda || tanda.tiendaId !== tienda.id) {
      return NextResponse.json(
        { error: "Tanda no encontrada" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const periodoIds = tanda.periodos.map((p) => p.id);
      await tx.tandaPago.deleteMany({
        where: { periodoId: { in: periodoIds } },
      });
      await tx.tandaPeriodo.deleteMany({ where: { tandaId: id } });
      await tx.tandaParticipante.deleteMany({ where: { tandaId: id } });
      await tx.tanda.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/tandas/[id]", error);
    return NextResponse.json(
      { error: "Error al borrar la tanda" },
      { status: 500 }
    );
  }
}
