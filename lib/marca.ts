import { prisma } from "@/lib/prisma";

/**
 * Devuelve la marca "canónica" para una tienda: si ya existe una marca igual
 * (ignorando mayúsculas y espacios), reusa esa escritura exacta para no crear
 * duplicados como "Nike", "nike" o "Nike ". Si no existe, guarda la versión
 * recortada. Cadena vacía -> null.
 */
export async function canonizarMarca(
  tiendaId: string,
  raw: unknown
): Promise<string | null> {
  const limpio = typeof raw === "string" ? raw.trim() : "";
  if (!limpio) return null;

  const existentes = await prisma.producto.findMany({
    where: { tiendaId, marca: { not: null } },
    select: { marca: true },
    distinct: ["marca"],
  });

  const igual = existentes.find(
    (p) => p.marca && p.marca.trim().toLowerCase() === limpio.toLowerCase()
  );

  return igual?.marca ?? limpio;
}
