import { NextResponse } from "next/server";
import { obtenerTiendaDeSesion } from "@/lib/auth";
import { normalizarModulos } from "@/lib/modulos";
import { generarContenido } from "@/lib/ia";
import { revisarLimiteIA, registrarUsoIA } from "@/lib/uso-ia";

export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const mods = normalizarModulos(tienda.modulos);
    if (!mods.iaContenido) {
      return NextResponse.json(
        { error: "El generador de contenido no está habilitado para esta tienda" },
        { status: 403 }
      );
    }

    const limite = await revisarLimiteIA(tienda.id, { funcion: "contenido" });
    if (!limite.ok) {
      return NextResponse.json({ error: limite.mensaje }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const tipo = body.tipo === "post" ? "post" : "descripcion";
    const nombre = (body.nombre || "").trim();
    if (!nombre) {
      return NextResponse.json(
        { error: "Pon el nombre del producto primero" },
        { status: 400 }
      );
    }

    const datos = {
      nombre,
      marca: (body.marca || "").trim(),
      categoria: (body.categoria || "").trim(),
      precio: (body.precio || "").toString().trim(),
    };

    let texto: string;
    try {
      texto = await generarContenido(tipo, datos);
    } catch (errorIA) {
      await registrarUsoIA(
        tienda.id,
        "contenido",
        false,
        errorIA instanceof Error ? errorIA.message : "error"
      );
      throw errorIA;
    }

    await registrarUsoIA(tienda.id, "contenido", true, tipo);

    return NextResponse.json({ texto });
  } catch (error) {
    console.error("POST /api/ia/contenido", error);
    const mensaje =
      error instanceof Error ? error.message : "Error al generar el contenido";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
