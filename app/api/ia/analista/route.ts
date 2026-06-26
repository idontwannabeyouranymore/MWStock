import { NextResponse } from "next/server";
import { obtenerTiendaDeSesion } from "@/lib/auth";
import { normalizarModulos } from "@/lib/modulos";
import { responderAnalista } from "@/lib/ia";
import { resumenTienda } from "@/lib/resumen-tienda";
import { revisarLimiteIA, registrarUsoIA } from "@/lib/uso-ia";

export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const mods = normalizarModulos(tienda.modulos);
    if (!mods.iaAnalista) {
      return NextResponse.json(
        { error: "El asistente de IA no está habilitado para esta tienda" },
        { status: 403 }
      );
    }

    const limite = await revisarLimiteIA(tienda.id, { funcion: "analista" });
    if (!limite.ok) {
      return NextResponse.json({ error: limite.mensaje }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const pregunta = (body.pregunta || "").trim();
    if (!pregunta) {
      return NextResponse.json(
        { error: "Escribe una pregunta" },
        { status: 400 }
      );
    }

    const resumen = await resumenTienda(tienda.id);

    let respuesta: string;
    try {
      respuesta = await responderAnalista(pregunta, resumen);
    } catch (errorIA) {
      await registrarUsoIA(
        tienda.id,
        "analista",
        false,
        errorIA instanceof Error ? errorIA.message : "error"
      );
      throw errorIA;
    }

    await registrarUsoIA(tienda.id, "analista", true, pregunta.slice(0, 80));

    return NextResponse.json({ respuesta });
  } catch (error) {
    console.error("POST /api/ia/analista", error);
    const mensaje =
      error instanceof Error ? error.message : "Error al consultar el asistente";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
