import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type Frecuencia = "SEMANAL" | "QUINCENAL" | "MENSUAL";

// Calcula la fecha de cada periodo según la frecuencia.
function fechaPeriodo(
  inicio: Date,
  numero: number,
  frecuencia: Frecuencia
): Date {
  const d = new Date(inicio);
  const offset = numero - 1;
  if (frecuencia === "SEMANAL") d.setDate(d.getDate() + offset * 7);
  else if (frecuencia === "QUINCENAL") d.setDate(d.getDate() + offset * 14);
  else d.setMonth(d.getMonth() + offset);
  return d;
}

// GET: lista de tandas con su progreso.
export async function GET() {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tandas = await prisma.tanda.findMany({
      where: { tiendaId: tienda.id },
      include: {
        participantes: { select: { id: true } },
        periodos: {
          select: { entregado: true, pagos: { select: { pagado: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = tandas.map((t) => {
      const cuota = Number(t.cuota);
      const n = t.participantes.length;
      const pagados = t.periodos.reduce(
        (s, p) => s + p.pagos.filter((x) => x.pagado).length,
        0
      );
      const totalPagos = t.periodos.reduce((s, p) => s + p.pagos.length, 0);
      const entregados = t.periodos.filter((p) => p.entregado).length;
      return {
        id: t.id,
        nombre: t.nombre,
        cuota,
        frecuencia: t.frecuencia,
        estado: t.estado,
        fechaInicio: t.fechaInicio,
        participantes: n,
        periodosTotal: t.periodos.length,
        periodosEntregados: entregados,
        recaudado: pagados * cuota,
        esperado: totalPagos * cuota,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/tandas", error);
    return NextResponse.json(
      { error: "Error al obtener tandas" },
      { status: 500 }
    );
  }
}

// POST: crear tanda con participantes; genera periodos y pagos.
export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const nombre = body.nombre?.trim();
    const cuota = Number(body.cuota);
    const frecuencia: Frecuencia = body.frecuencia || "SEMANAL";
    const fechaInicio = body.fechaInicio
      ? new Date(body.fechaInicio)
      : new Date();
    const participantes: string[] = Array.isArray(body.participantes)
      ? body.participantes.filter(Boolean)
      : [];

    if (!nombre) {
      return NextResponse.json(
        { error: "Falta el nombre de la tanda" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(cuota) || cuota <= 0) {
      return NextResponse.json(
        { error: "La cuota debe ser mayor a 0" },
        { status: 400 }
      );
    }
    if (participantes.length < 2) {
      return NextResponse.json(
        { error: "Una tanda necesita al menos 2 participantes" },
        { status: 400 }
      );
    }
    if (new Set(participantes).size !== participantes.length) {
      return NextResponse.json(
        { error: "Hay un participante repetido" },
        { status: 400 }
      );
    }
    if (!["SEMANAL", "QUINCENAL", "MENSUAL"].includes(frecuencia)) {
      return NextResponse.json(
        { error: "Frecuencia inválida" },
        { status: 400 }
      );
    }

    // Verifica que todos los clientes sean de esta tienda.
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: participantes }, tiendaId: tienda.id },
      select: { id: true },
    });
    if (clientes.length !== participantes.length) {
      return NextResponse.json(
        { error: "Algún cliente no pertenece a tu tienda" },
        { status: 400 }
      );
    }

    const n = participantes.length;

    const tanda = await prisma.$transaction(async (tx) => {
      const nueva = await tx.tanda.create({
        data: {
          nombre,
          cuota,
          frecuencia,
          fechaInicio,
          tiendaId: tienda.id,
        },
      });

      // Participantes: el orden define el turno (1..N).
      const parts = [];
      for (let i = 0; i < n; i++) {
        const p = await tx.tandaParticipante.create({
          data: {
            turno: i + 1,
            tandaId: nueva.id,
            clienteId: participantes[i],
          },
        });
        parts.push(p);
      }

      // Periodos (1..N) y pagos (todos pagan menos quien recibe ese periodo).
      for (let numero = 1; numero <= n; numero++) {
        const periodo = await tx.tandaPeriodo.create({
          data: {
            numero,
            fecha: fechaPeriodo(fechaInicio, numero, frecuencia),
            tandaId: nueva.id,
          },
        });
        for (const part of parts) {
          if (part.turno === numero) continue; // quien recibe no paga
          await tx.tandaPago.create({
            data: {
              periodoId: periodo.id,
              participanteId: part.id,
            },
          });
        }
      }

      return nueva;
    });

    return NextResponse.json(tanda, { status: 201 });
  } catch (error) {
    console.error("POST /api/tandas", error);
    return NextResponse.json(
      { error: "Error al crear la tanda" },
      { status: 500 }
    );
  }
}
