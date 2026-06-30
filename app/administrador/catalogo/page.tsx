"use client";

import { useEffect, useMemo, useState } from "react";

type Variante = {
  id: string;
  talla: string;
  stock: number;
  precio: string | null;
  estado: string;
};

type Producto = {
  id: string;
  nombre: string;
  marca?: string | null;
  precio: string;
  estado: string;
  imagenes: { url: string }[];
  variantes: Variante[];
  colecciones?: { coleccion: { nombre: string } }[];
};

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/productos")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Producto[]) =>
        setProductos(
          Array.isArray(d) ? d.filter((p) => p.estado !== "ARCHIVADO") : []
        )
      )
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const q = busqueda.toLowerCase().trim();
  const filtrados = productos.filter((p) => {
    if (q === "") return true;
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.marca || "").toLowerCase().includes(q) ||
      (p.colecciones || []).some((c) =>
        c.coleccion.nombre.toLowerCase().includes(q)
      )
    );
  });

  // Agrupa por sección (colección) y marca.
  const grupos = useMemo(() => {
    const porCol = new Map<string, Map<string, Producto[]>>();
    for (const p of filtrados) {
      const col = p.colecciones?.[0]?.coleccion.nombre || "Sin colección";
      const mar = (p.marca || "").trim() || "Otros";
      if (!porCol.has(col)) porCol.set(col, new Map());
      const mp = porCol.get(col)!;
      if (!mp.has(mar)) mp.set(mar, []);
      mp.get(mar)!.push(p);
    }
    return [...porCol.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([col, mp]) => ({
        col,
        marcas: [...mp.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      }));
  }, [filtrados]);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            MWStock
          </p>
          <h1 className="mt-2 text-3xl font-bold">Catálogo e inventario</h1>
          <p className="mt-2 text-neutral-400">
            Consulta los productos y cuántas piezas hay. Solo para ver.
          </p>
        </div>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, marca o colección..."
          className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
        />

        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : grupos.length === 0 ? (
          <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
            No hay productos.
          </p>
        ) : (
          <div className="space-y-6">
            {grupos.map((grupo) => (
              <div key={grupo.col} className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
                  {grupo.col}
                </h2>
                {grupo.marcas.map(([marca, prods]) => (
                  <div key={marca} className="space-y-2">
                    {grupo.marcas.length > 1 && (
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                        {marca}
                      </p>
                    )}
                    {prods.map((producto) => {
                      const tallas = producto.variantes.filter(
                        (v) => v.estado !== "ARCHIVADA"
                      );
                      const total = tallas.reduce((s, v) => s + v.stock, 0);
                      return (
                        <div
                          key={producto.id}
                          className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex gap-3">
                              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                                {producto.imagenes[0] ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={producto.imagenes[0].url}
                                    alt={producto.nombre}
                                    className="h-full w-full object-cover"
                                  />
                                ) : null}
                              </div>
                              <div>
                                <h3 className="font-semibold leading-tight">
                                  {producto.nombre}
                                </h3>
                                {producto.marca ? (
                                  <p className="text-xs text-neutral-500">
                                    {producto.marca}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <span
                              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                                total === 0
                                  ? "bg-red-900/50 text-red-400"
                                  : "bg-neutral-800 text-neutral-300"
                              }`}
                            >
                              {total} en stock
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {tallas.map((v) => (
                              <span
                                key={v.id}
                                className={`rounded-lg px-3 py-1.5 text-sm ${
                                  v.stock > 0
                                    ? "bg-neutral-800 text-neutral-200"
                                    : "bg-neutral-950 text-neutral-600 line-through"
                                }`}
                              >
                                {v.talla} ·{" "}
                                <span className="font-semibold">
                                  {v.stock}
                                </span>{" "}
                                pza(s)
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
