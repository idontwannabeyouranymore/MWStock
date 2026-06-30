import { NextRequest, NextResponse } from "next/server";
import { verificarToken } from "@/lib/session";

// Rutas de API que deben seguir siendo públicas (sin sesión).
const RUTAS_API_PUBLICAS = ["/api/auth/login", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir login/logout sin token.
  if (RUTAS_API_PUBLICAS.some((ruta) => pathname.startsWith(ruta))) {
    return NextResponse.next();
  }

  const esApi = pathname.startsWith("/api");
  const token = request.cookies.get("mwstock_session")?.value;

  // Sin token: 401 para API, redirect a login para páginas.
  if (!token) {
    return esApi
      ? NextResponse.json({ error: "No autorizado" }, { status: 401 })
      : NextResponse.redirect(new URL("/login", request.url));
  }

  let payload;
  try {
    payload = await verificarToken(token);
  } catch {
    return esApi
      ? NextResponse.json(
          { error: "Sesión inválida o expirada" },
          { status: 401 }
        )
      : NextResponse.redirect(new URL("/login", request.url));
  }

  // Área del dueño: requiere rol DUENO.
  const esAreaDueno =
    pathname.startsWith("/dueno") || pathname.startsWith("/api/dueno");

  if (esAreaDueno && payload.rol !== "DUENO") {
    return esApi
      ? NextResponse.json({ error: "Solo el dueño" }, { status: 403 })
      : NextResponse.redirect(new URL("/administrador", request.url));
  }

  // Vendedor: dentro del panel solo puede ver el POS y su cuenta (sin estadísticas).
  if (
    payload.rol === "VENDEDOR" &&
    pathname.startsWith("/administrador") &&
    !pathname.startsWith("/administrador/pos") &&
    !pathname.startsWith("/administrador/catalogo") &&
    !pathname.startsWith("/administrador/manual") &&
    !pathname.startsWith("/administrador/cuenta")
  ) {
    return NextResponse.redirect(
      new URL("/administrador/pos", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  // Protege el panel admin, el panel del dueño y la API. El catálogo público
  // (/tienda/...) queda libre, servido por ruta.
  matcher: ["/administrador/:path*", "/dueno/:path*", "/api/:path*"],
};
