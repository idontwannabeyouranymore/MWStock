import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esDueno } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// Suspender o reactivar una tienda (activa: true | false).
export async function PATCH(request: Request, context: RouteContext) {
  if (!(await esDueno())) {
    return NextResponse.json({ error: "Solo el dueño" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await request.json();

  if (typeof body.activa !== "boolean") {
    return NextResponse.json(
      { error: "Falta el campo 'activa' (true/false)" },
      { status: 400 }
    );
  }

  const existe = await prisma.tienda.findUnique({ where: { id } });
  if (!existe) {
    return NextResponse.json(
      { error: "Tienda no encontrada" },
      { status: 404 }
    );
  }

  const tienda = await prisma.tienda.update({
    where: { id },
    data: { activa: body.activa },
  });

  return NextResponse.json(tienda);
}
