import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizarModulos } from "@/lib/modulos";
import { interpretarBusqueda } from "@/lib/ia";
import { revisarLimiteIA, registrarUsoIA } from "@/lib/uso-ia";

// Pública: el catálogo manda la búsqueda en lenguaje natural y recibe filtros.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const slug = (body.slug || "").trim();
    const query = (body.query || "").trim();

    if (!slug || !query) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const tienda = await prisma.tienda.findUnique({ where: { slug } });
    if (!tienda || !tienda.activa) {
      return NextResponse.json({ error: "Tienda no disponible" }, { status: 404 });
    }

    const mods = normalizarModulos(tienda.modulos);
    if (!mods.iaBusqueda) {
      return NextResponse.json(
        { error: "Búsqueda con IA no habilitada" },
        { status: 403 }
      );
    }

    const limite = await revisarLimiteIA(tienda.id, {
      funcion: "busqueda",
      diario: 300,
      mensual: 5000,
    });
    if (!limite.ok) {
      return NextResponse.json({ error: limite.mensaje }, { status: 429 });
    }

    // Categorías y marcas reales de la tienda (para que la IA mapee a valores válidos).
    const [colecciones, productos] = await Promise.all([
      prisma.coleccion.findMany({
        where: { tiendaId: tienda.id, estado: "ACTIVA" },
        select: { nombre: true },
      }),
      prisma.producto.findMany({
        where: {
          tiendaId: tienda.id,
          estado: { not: "ARCHIVADO" },
          marca: { not: null },
        },
        select: { marca: true },
        distinct: ["marca"],
      }),
    ]);

    const categorias = colecciones.map((c) => c.nombre);
    const marcas = productos
      .map((p) => p.marca)
      .filter((m): m is string => !!m && m.trim() !== "");

    let filtro;
    try {
      filtro = await interpretarBusqueda(query, categorias, marcas);
    } catch (errorIA) {
      await registrarUsoIA(
        tienda.id,
        "busqueda",
        false,
        errorIA instanceof Error ? errorIA.message : "error"
      );
      throw errorIA;
    }

    await registrarUsoIA(tienda.id, "busqueda", true, query.slice(0, 80));

    return NextResponse.json({ filtro });
  } catch (error) {
    console.error("POST /api/buscar-ia", error);
    const mensaje =
      error instanceof Error ? error.message : "Error en la búsqueda";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
