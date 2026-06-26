// Guardarraíles de IA: límite de uso por tienda + registro (log).

import { prisma } from "@/lib/prisma";

// Límites configurables por variable de entorno (con valores por defecto).
export const LIMITE_DIARIO = Number(process.env.IA_LIMITE_DIARIO || 30);
export const LIMITE_MENSUAL = Number(process.env.IA_LIMITE_MENSUAL || 300);

// Revisa si la tienda todavía puede usar la IA hoy / este mes.
// Se puede limitar por función (cada una con su propio presupuesto) y con límites
// distintos (la búsqueda pública usa límites más altos que las cargas del dueño).
export async function revisarLimiteIA(
  tiendaId: string,
  opciones?: { funcion?: string; diario?: number; mensual?: number }
): Promise<{ ok: boolean; mensaje?: string }> {
  const diario = opciones?.diario ?? LIMITE_DIARIO;
  const mensual = opciones?.mensual ?? LIMITE_MENSUAL;
  const whereFn = opciones?.funcion ? { funcion: opciones.funcion } : {};

  const ahora = new Date();
  const inicioDia = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  );
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [hoy, mes] = await Promise.all([
    prisma.usoIA.count({
      where: { tiendaId, ...whereFn, createdAt: { gte: inicioDia } },
    }),
    prisma.usoIA.count({
      where: { tiendaId, ...whereFn, createdAt: { gte: inicioMes } },
    }),
  ]);

  if (hoy >= diario) {
    return {
      ok: false,
      mensaje: `Llegaste al límite de ${diario} usos de IA por hoy. Intenta de nuevo mañana.`,
    };
  }
  if (mes >= mensual) {
    return {
      ok: false,
      mensaje: `Llegaste al límite de ${mensual} usos de IA este mes.`,
    };
  }
  return { ok: true };
}

// Registra un uso de IA (éxito o fallo). No interrumpe el flujo si falla el log.
export async function registrarUsoIA(
  tiendaId: string,
  funcion: string,
  exito: boolean,
  detalle?: string
) {
  try {
    await prisma.usoIA.create({
      data: {
        tiendaId,
        funcion,
        exito,
        detalle: detalle ? detalle.slice(0, 300) : null,
      },
    });
  } catch (error) {
    console.error("registrarUsoIA", error);
  }
}
