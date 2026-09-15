"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  leerCarrito,
  onCarritoCambio,
  totalCarrito,
} from "@/lib/carrito-mayoreo";

export default function BarraCarritoMayoreo({
  slug,
  hrefCarrito,
  colorTema,
}: {
  slug: string;
  hrefCarrito: string;
  colorTema: string;
}) {
  const [datos, setDatos] = useState({ piezas: 0, dinero: 0 });

  useEffect(() => {
    const actualizar = () => setDatos(totalCarrito(leerCarrito(slug)));
    actualizar();
    return onCarritoCambio(actualizar);
  }, [slug]);

  if (datos.piezas === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div>
          <p className="text-xs text-neutral-400">
            {datos.piezas} {datos.piezas === 1 ? "pieza" : "piezas"}
          </p>
          <p className="text-lg font-bold text-white">
            ${datos.dinero.toFixed(2)}
          </p>
        </div>
        <Link
          href={hrefCarrito}
          className="rounded-xl px-6 py-3 font-semibold text-black transition hover:opacity-90"
          style={{ backgroundColor: colorTema }}
        >
          Ver carrito
        </Link>
      </div>
    </div>
  );
}
