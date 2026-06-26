import { cookies } from "next/headers";
import { verificarToken } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/**
 * Devuelve el id del usuario de la sesión actual (o null si no hay sesión válida).
 * Las rutas /api ya están protegidas por el middleware, pero aquí volvemos a
 * leer la cookie para saber QUIÉN es el usuario y a qué tienda pertenece.
 */
export async function obtenerUsuarioId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("mwstock_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const payload = await verificarToken(token);
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

/**
 * Devuelve la tienda del usuario en sesión. Reemplaza al TIENDA_ID hardcodeado:
 * la relación Usuario→Tienda es 1:1 (usuarioId es único en el schema).
 */
export async function obtenerTiendaDeSesion() {
  const usuarioId = await obtenerUsuarioId();

  if (!usuarioId) {
    return null;
  }

  // Admin/dueño: la tienda que poseen.
  const propia = await prisma.tienda.findUnique({ where: { usuarioId } });
  if (propia) return propia;

  // Vendedor: la tienda donde trabaja.
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { tiendaTrabajoId: true },
  });
  if (usuario?.tiendaTrabajoId) {
    return prisma.tienda.findUnique({ where: { id: usuario.tiendaTrabajoId } });
  }

  return null;
}

/**
 * Devuelve el rol del usuario en sesión ("ADMIN" | "DUENO" | "VENDEDOR") o null.
 */
export async function obtenerRol(): Promise<string | null> {
  const sesion = await obtenerSesion();
  return typeof sesion?.rol === "string" ? sesion.rol : null;
}

/**
 * Devuelve el payload del JWT de la sesión (incluye userId, email y rol), o null.
 */
export async function obtenerSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mwstock_session")?.value;

  if (!token) {
    return null;
  }

  try {
    return await verificarToken(token);
  } catch {
    return null;
  }
}

/**
 * True si el usuario en sesión es el dueño de la plataforma.
 */
export async function esDueno() {
  const sesion = await obtenerSesion();
  return sesion?.rol === "DUENO";
}
