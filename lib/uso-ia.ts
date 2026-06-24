// Guardarraíles de IA: límite de uso por tienda + registro (log).

import { prisma } from "@/lib/prisma";

// Límites configurables por variable de entorno (con valores por defecto).
export const LIMITE_DIARIO = Number(process.env.IA_LIMITE_DIARIO || 30);
export const LIMITE_MENSUAL = Number(process.env.IA_LIMITE_MENSUAL || 300);

// Revisa si la tienda todavía puede usar la IA hoy / este mes.
export async function revisarLimiteIA(
  tiendaId: string
): Promise<{ ok: boolean; mensaje?: string }> {
  const ahora = new Date();
  const inicioDia = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate()
  );
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [hoy, mes] = await Promise.all([
    prisma.usoIA.count({
      where: { tiendaId, createdAt: { gte: inicioDia } },
    }),
    prisma.usoIA.count({
      where: { tiendaId, createdAt: { gte: inicioMes } },
    }),
  ]);

  if (hoy >= LIMITE_DIARIO) {
    return {
      ok: false,
      mensaje: `Llegaste al límite de ${LIMITE_DIARIO} usos de IA por hoy. Intenta de nuevo mañana.`,
    };
  }
  if (mes >= LIMITE_MENSUAL) {
    return {
      ok: false,
      mensaje: `Llegaste al límite de ${LIMITE_MENSUAL} usos de IA este mes.`,
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
