import { NextRequest, NextResponse } from "next/server";
import { verificarToken } from "@/lib/session";

// Rutas de API que deben seguir siendo públicas (sin sesión).
const RUTAS_API_PUBLICAS = ["/api/auth/login", "/api/auth/logout"];

// Extrae el subdominio de tienda del host, o null si es el dominio raíz/www.
function obtenerSubdominio(host: string, root: string): string | null {
  const h = host.split(":")[0];
  const r = root.split(":")[0];

  if (h === r || h === `www.${r}`) return null;

  if (h.endsWith(`.${r}`)) {
    const sub = h.slice(0, h.length - r.length - 1);
    return sub && sub !== "www" ? sub : null;
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // === Ruteo por subdominio (solo si está activado) ===
  if (process.env.NEXT_PUBLIC_SUBDOMINIOS === "true") {
    const host = request.headers.get("host") || "";
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
    const sub = obtenerSubdominio(host, root);

    if (sub) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "No disponible" }, { status: 404 });
      }

      const url = request.nextUrl.clone();
      if (!pathname.startsWith("/tienda/")) {
        url.pathname = `/tienda/${sub}${pathname === "/" ? "" : pathname}`;
      }
      return NextResponse.rewrite(url);
    }

    // Dominio raíz: /tienda/<slug> se redirige a su subdominio.
    if (pathname.startsWith("/tienda/")) {
      const partes = pathname.split("/");
      const slug = partes[2];
      if (slug) {
        const resto = partes.slice(3).join("/");
        const proto = root.includes("localhost") ? "http" : "https";
        const destino = `${proto}://${slug}.${root}${resto ? "/" + resto : ""}`;
        return NextResponse.redirect(destino);
      }
    }
  }

  // === Autenticación ===
  if (RUTAS_API_PUBLICAS.some((ruta) => pathname.startsWith(ruta))) {
    return NextResponse.next();
  }

  const esApi = pathname.startsWith("/api");
  const esProtegida =
    pathname.startsWith("/administrador") ||
    pathname.startsWith("/dueno") ||
    esApi;

  if (!esProtegida) {
    return NextResponse.next();
  }

  const token = request.cookies.get("mwstock_session")?.value;

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

  const esAreaDueno =
    pathname.startsWith("/dueno") || pathname.startsWith("/api/dueno");

  if (esAreaDueno && payload.rol !== "DUENO") {
    return esApi
      ? NextResponse.json({ error: "Solo el dueño" }, { status: 403 })
      : NextResponse.redirect(new URL("/administrador", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png|manifest.webmanifest|sw.js).*)",
  ],
};
