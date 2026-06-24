import { NextResponse } from "next/server";
import { obtenerTiendaDeSesion } from "@/lib/auth";
import { normalizarModulos } from "@/lib/modulos";
import { extraerProductosDeImagenes, type FilaProducto } from "@/lib/ia";
import { revisarLimiteIA, registrarUsoIA } from "@/lib/uso-ia";

export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const mods = normalizarModulos(tienda.modulos);
    if (!mods.iaInventario) {
      return NextResponse.json(
        { error: "La herramienta de IA no está habilitada para esta tienda" },
        { status: 403 }
      );
    }

    // Guardarraíl: límite de uso por tienda.
    const limite = await revisarLimiteIA(tienda.id);
    if (!limite.ok) {
      return NextResponse.json({ error: limite.mensaje }, { status: 429 });
    }

    const form = await request.formData();
    const archivos = form
      .getAll("fotos")
      .filter((f): f is File => f instanceof File);

    if (archivos.length === 0) {
      return NextResponse.json(
        { error: "Sube al menos una foto de tu lista" },
        { status: 400 }
      );
    }
    if (archivos.length > 5) {
      return NextResponse.json(
        { error: "Máximo 5 fotos por intento" },
        { status: 400 }
      );
    }

    const imagenes: { mimeType: string; base64: string }[] = [];
    for (const archivo of archivos) {
      if (!archivo.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "Solo se permiten imágenes" },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await archivo.arrayBuffer());
      imagenes.push({
        mimeType: archivo.type || "image/jpeg",
        base64: buffer.toString("base64"),
      });
    }

    let filas: FilaProducto[];
    try {
      filas = await extraerProductosDeImagenes(imagenes);
    } catch (errorIA) {
      await registrarUsoIA(
        tienda.id,
        "foto-inventario",
        false,
        errorIA instanceof Error ? errorIA.message : "error"
      );
      throw errorIA;
    }

    await registrarUsoIA(
      tienda.id,
      "foto-inventario",
      true,
      `${filas.length} filas`
    );

    if (filas.length === 0) {
      return NextResponse.json(
        { error: "La IA no encontró productos en la foto. Intenta con una más clara." },
        { status: 422 }
      );
    }

    return NextResponse.json({ filas });
  } catch (error) {
    console.error("POST /api/ia/extraer-productos", error);
    const mensaje =
      error instanceof Error ? error.message : "Error al procesar la foto";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
