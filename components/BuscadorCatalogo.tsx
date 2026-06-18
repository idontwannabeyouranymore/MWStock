"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { enlaceCatalogo } from "@/lib/dominios";

type ProductoBusqueda = {
  id: string;
  nombre: string;
  imagen: string | null;
  soldOut: boolean;
  precioMin: number;
  precioMax: number;
  esSet: boolean;
};

type Props = {
  productos: ProductoBusqueda[];
  slug: string;
  colorTema: string;
  emojis: boolean;
};

export default function BuscadorCatalogo({
  productos,
  slug,
  colorTema,
  emojis,
}: Props) {
  const [q, setQ] = useState("");

  const buscando = q.trim().length >= 2;

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return productos
      .filter((p) => p.nombre.toLowerCase().includes(t))
      .slice(0, 60);
  }, [q, productos]);

  return (
    <div className="space-y-5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={emojis ? "🔍  Buscar..." : "Buscar..."}
        className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-4 text-white outline-none focus:border-white"
      />

      {buscando && (
        <div>
          {filtrados.length === 0 ? (
            <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
              Sin resultados para &quot;{q}&quot;.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtrados.map((p) => (
                <Link
                  key={p.id}
                  href={enlaceCatalogo(slug, `/producto/${p.id}`)}
                  className="group block overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 transition hover:-translate-y-1 hover:border-neutral-600"
                >
                  <div className="relative flex h-48 items-center justify-center overflow-hidden bg-neutral-800">
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="text-neutral-500">Sin imagen</span>
                    )}
                    {p.esSet && (
                      <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-black">
                        Set
                      </span>
                    )}
                    {p.soldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <span className="rounded-full border border-white px-4 py-1 text-sm font-bold">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <h3 className="font-semibold">{p.nombre}</h3>
                    <p className="font-bold" style={{ color: colorTema }}>
                      {p.precioMin === p.precioMax
                        ? `$${p.precioMin.toFixed(2)}`
                        : `desde $${p.precioMin.toFixed(2)}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
