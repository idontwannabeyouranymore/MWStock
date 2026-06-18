import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";

type Fila = {
  categoria?: string;
  marca?: string;
  nombre?: string;
  presentacion?: string;
  precio?: string | number;
  stock?: string | number;
};

const norm = (s?: string) => (s || "").trim();

export async function POST(request: Request) {
  try {
    const tienda = await obtenerTiendaDeSesion();
    if (!tienda) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const filas: Fila[] = Array.isArray(body.filas) ? body.filas : [];
    if (filas.length === 0) {
      return NextResponse.json(
        { error: "El archivo no tiene filas válidas" },
        { status: 400 }
      );
    }
    if (filas.length > 5000) {
      return NextResponse.json(
        { error: "Demasiadas filas (máximo 5000)" },
        { status: 400 }
      );
    }

    // Agrupar filas por producto (nombre + marca).
    type Grupo = {
      nombre: string;
      marca: string;
      categoria: string;
      variantes: { talla: string; precio: number; stock: number }[];
    };
    const grupos = new Map<string, Grupo>();

    for (const f of filas) {
      const nombre = norm(f.nombre);
      const presentacion = norm(f.presentacion);
      if (!nombre || !presentacion) continue;

      const precioNum = Number(
        String(f.precio ?? "")
          .replace(/[^0-9.]/g, "")
          .trim()
      );
      if (!Number.isFinite(precioNum) || precioNum <= 0) continue; // ignora N/D o vacío

      const stockNum = Math.max(
        0,
        Math.trunc(Number(String(f.stock ?? "0").replace(/[^0-9-]/g, "")) || 0)
      );

      const marca = norm(f.marca);
      const categoria = norm(f.categoria) || "Sin categoría";
      const key = `${nombre.toLowerCase()}||${marca.toLowerCase()}||${categoria.toLowerCase()}`;

      if (!grupos.has(key)) {
        grupos.set(key, { nombre, marca, categoria, variantes: [] });
      }
      grupos.get(key)!.variantes.push({
        talla: presentacion,
        precio: precioNum,
        stock: stockNum,
      });
    }

    if (grupos.size === 0) {
      return NextResponse.json(
        { error: "No se encontraron productos con precio válido" },
        { status: 400 }
      );
    }

    // Cache de colecciones (find-or-create) por nombre.
    const coleccionesCache = new Map<string, string>();
    async function obtenerColeccion(nombre: string): Promise<string> {
      const clave = nombre.toLowerCase();
      if (coleccionesCache.has(clave)) return coleccionesCache.get(clave)!;
      const existente = await prisma.coleccion.findFirst({
        where: { tiendaId: tienda!.id, nombre },
      });
      if (existente) {
        coleccionesCache.set(clave, existente.id);
        return existente.id;
      }
      const nueva = await prisma.coleccion.create({
        data: { nombre, tiendaId: tienda!.id },
      });
      coleccionesCache.set(clave, nueva.id);
      return nueva.id;
    }

    let creados = 0;
    let omitidos = 0;
    let variantesCreadas = 0;
    const errores: string[] = [];

    for (const grupo of grupos.values()) {
      try {
        const coleccionId = await obtenerColeccion(grupo.categoria);

        // Evita duplicados: mismo nombre (+ marca) dentro de la misma colección.
        // Así un perfume puede existir como decant y como completo por separado.
        const yaExiste = await prisma.producto.findFirst({
          where: {
            tiendaId: tienda.id,
            nombre: grupo.nombre,
            marca: grupo.marca || null,
            colecciones: { some: { coleccionId } },
          },
        });
        if (yaExiste) {
          omitidos += 1;
          continue;
        }

        const precioBase = Math.min(...grupo.variantes.map((v) => v.precio));

        await prisma.producto.create({
          data: {
            nombre: grupo.nombre,
            marca: grupo.marca || null,
            precio: precioBase,
            tiendaId: tienda.id,
            colecciones: { create: [{ coleccionId }] },
            variantes: {
              create: grupo.variantes.map((v) => ({
                talla: v.talla,
                precio: v.precio,
                stock: v.stock,
                estado: v.stock > 0 ? "ACTIVA" : "AGOTADA",
              })),
            },
          },
        });
        creados += 1;
        variantesCreadas += grupo.variantes.length;
      } catch (e) {
        errores.push(
          `${grupo.nombre}: ${e instanceof Error ? e.message : "error"}`
        );
      }
    }

    return NextResponse.json({
      ok: true,
      creados,
      omitidos,
      colecciones: coleccionesCache.size,
      variantes: variantesCreadas,
      errores: errores.slice(0, 20),
    });
  } catch (error) {
    console.error("POST /api/importar", error);
    return NextResponse.json(
      { error: "Error al importar" },
      { status: 500 }
    );
  }
}
