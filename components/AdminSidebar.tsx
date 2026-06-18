"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/administrador", label: "Dashboard" },
  { href: "/administrador/pos", label: "Punto de venta" },
  { href: "/administrador/colecciones", label: "Colecciones" },
  { href: "/administrador/productos", label: "Productos" },
  { href: "/administrador/inventario", label: "Inventario" },
  { href: "/administrador/ventas", label: "Ventas" },
  { href: "/administrador/clientes", label: "Clientes" },
  { href: "/administrador/qr", label: "Código QR" },
  { href: "/administrador/configuracion", label: "Configuración" },
  { href: "/administrador/cuenta", label: "Mi cuenta" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("ROPA");

  // Cierra el menú al navegar.
  useEffect(() => {
    setAbierto(false);
  }, [pathname]);

  useEffect(() => {
    fetch("/api/tienda")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tipo) setTipo(d.tipo);
      })
      .catch(() => {});
  }, []);

  // Las perfumerías ven el menú "Sets" después de "Productos".
  const linksMostrar =
    tipo === "PERFUMES"
      ? links.flatMap((l) => {
          if (l.href === "/administrador/productos")
            return [l, { href: "/administrador/sets", label: "Sets" }];
          if (l.href === "/administrador/clientes")
            return [l, { href: "/administrador/tandas", label: "Tandas" }];
          return [l];
        })
      : links;

  return (
    <>
      {/* Barra superior (solo móvil) */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-3 md:hidden">
        <span className="text-lg font-bold text-white">MWStock</span>
        <button
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="rounded-lg border border-neutral-700 px-3 py-2 text-lg leading-none text-white"
        >
          ☰
        </button>
      </div>

      {/* Fondo oscuro al abrir el cajón (solo móvil) */}
      {abierto && (
        <div
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      {/* Sidebar / cajón */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-neutral-800 bg-neutral-900 transition-transform duration-300 md:static md:z-auto md:translate-x-0 ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between p-6">
          <div>
            <h1 className="text-2xl font-bold text-white">MWStock</h1>
            <p className="mt-1 text-sm text-neutral-400">Panel administrador</p>
          </div>

          <button
            onClick={() => setAbierto(false)}
            aria-label="Cerrar menú"
            className="text-xl leading-none text-neutral-400 md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-1 px-4">
          {linksMostrar.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-xl px-4 py-3 transition ${
                  active
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto p-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-xs uppercase tracking-wider text-neutral-500">
              Plataforma
            </p>
            <p className="mt-2 font-semibold text-white">MWStock</p>
            <p className="mt-1 text-xs text-neutral-500">
              Inventario para tiendas de ropa
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
