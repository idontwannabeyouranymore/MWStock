import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";
import { normalizarModulos } from "@/lib/modulos";
import { emparejarFotosConProductos } from "@/lib/ia";
import { revisarLimiteIA, registrarUsoIA } from "@/lib/uso-ia";

export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const mods = normalizarModulos(tienda.modulos);
    if (!mods.iaEmparejarFotos) {
      return NextResponse.json(
        { error: "La herramienta de IA no está habilitada para esta tienda" },
        { status: 403 }
      );
    }

    const limite = await revisarLimiteIA(tienda.id, {
      funcion: "emparejar-fotos",
    });
    if (!limite.ok) {
      return NextResponse.json({ error: limite.mensaje }, { status: 429 });
    }

    const form = await request.formData();
    const archivos = form
      .getAll("fotos")
      .filter((f): f is File => f instanceof File);

    if (archivos.length === 0) {
      return NextResponse.json(
        { error: "Sube al menos una foto" },
        { status: 400 }
      );
    }
    if (archivos.length > 12) {
      return NextResponse.json(
        { error: "Máximo 12 fotos por intento" },
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

    const productos = await prisma.producto.findMany({
      where: { tiendaId: tienda.id, estado: { not: "ARCHIVADO" } },
      select: { id: true, nombre: true, marca: true },
      orderBy: { nombre: "asc" },
    });

    if (productos.length === 0) {
      return NextResponse.json(
        { error: "No hay productos para emparejar. Crea o importa productos primero." },
        { status: 400 }
      );
    }

    let matches;
    try {
      matches = await emparejarFotosConProductos(imagenes, productos);
    } catch (errorIA) {
      await registrarUsoIA(
        tienda.id,
        "emparejar-fotos",
        false,
        errorIA instanceof Error ? errorIA.message : "error"
      );
      throw errorIA;
    }

    await registrarUsoIA(
      tienda.id,
      "emparejar-fotos",
      true,
      `${archivos.length} fotos`
    );

    return NextResponse.json({ matches });
  } catch (error) {
    console.error("POST /api/ia/emparejar-fotos", error);
    const mensaje =
      error instanceof Error ? error.message : "Error al emparejar las fotos";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
