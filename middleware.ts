import { NextRequest, NextResponse } from "next/server";
import { verificarToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("mwstock_session")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await verificarToken(token);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/administrador/:path*"],
};