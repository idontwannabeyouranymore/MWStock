"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  {
  href: "/administrador/ventas",
  label: "Ventas",
},
  {
    href: "/administrador",
    label: "Dashboard",
  },
  {
    href: "/administrador/colecciones",
    label: "Colecciones",
  },
  {
    href: "/administrador/productos",
    label: "Productos",
  },
  {
    href: "/administrador/variantes",
    label: "Variantes",
  },
  {
    href: "/administrador/inventario",
    label: "Inventario",
  },
  {
    href: "/administrador/configuracion",
    label: "Configuración",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-neutral-800 bg-neutral-900">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white">
          MWStock
        </h1>

        <p className="mt-1 text-sm text-neutral-400">
          Panel administrador
        </p>
      </div>

      <nav className="space-y-2 px-4">
        {links.map((link) => {
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

          <p className="mt-2 font-semibold text-white">
            MWStock
          </p>

          <p className="mt-1 text-xs text-neutral-500">
            Inventario para tiendas de ropa
          </p>
        </div>
      </div>
    </aside>
  );
}