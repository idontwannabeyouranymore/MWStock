import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

// GET: lista de clientes con su saldo pendiente total.
export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const clientes = await prisma.cliente.findMany({
      where: { tiendaId: tienda.id },
      include: {
        deudas: { select: { saldo: true, estado: true } },
      },
      orderBy: { nombre: "asc" },
    });

    const data = clientes.map((c) => {
      const saldoTotal = c.deudas.reduce((s, d) => s + Number(d.saldo), 0);
      const deudasActivas = c.deudas.filter(
        (d) => d.estado === "PENDIENTE"
      ).length;
      return {
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        nota: c.nota,
        saldoTotal,
        deudasActivas,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/clientes", error);
    return NextResponse.json(
      { error: "Error al obtener clientes" },
      { status: 500 }
    );
  }
}

// POST: crear cliente.
export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const nombre = body.nombre?.trim();
    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        telefono: body.telefono?.trim() || null,
        nota: body.nota?.trim() || null,
        tiendaId: tienda.id,
      },
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    console.error("POST /api/clientes", error);
    return NextResponse.json(
      { error: "Error al crear cliente" },
      { status: 500 }
    );
  }
}
