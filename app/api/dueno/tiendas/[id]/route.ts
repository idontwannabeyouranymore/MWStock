import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esDueno } from "@/lib/auth";
import { MODULOS, normalizarModulos } from "@/lib/modulos";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Suspender/reactivar una tienda y/o prender-apagar sus herramientas (módulos).
export async function PATCH(request: Request, context: RouteContext) {
  if (!(await esDueno())) {
    return NextResponse.json({ error: "Solo el dueño" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const existe = await prisma.tienda.findUnique({ where: { id } });
  if (!existe) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  const data: { activa?: boolean; modulos?: Record<string, boolean> } = {};

  if (typeof body.activa === "boolean") {
    data.activa = body.activa;
  }

  // Acepta un objeto parcial { clave: boolean } y lo combina con lo guardado.
  if (body.modulos && typeof body.modulos === "object") {
    const actuales = normalizarModulos(existe.modulos);
    const clavesValidas = MODULOS.map((m) => m.clave);
    for (const [clave, valor] of Object.entries(body.modulos)) {
      if (clavesValidas.includes(clave as never) && typeof valor === "boolean") {
        actuales[clave as keyof typeof actuales] = valor;
      }
    }
    data.modulos = actuales;
  }

  if (data.activa === undefined && data.modulos === undefined) {
    return NextResponse.json(
      { error: "Nada que actualizar (envía 'activa' o 'modulos')" },
      { status: 400 }
    );
  }

  const tienda = await prisma.tienda.update({ where: { id }, data });
  return NextResponse.json(tienda);
}
