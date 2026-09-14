"use client";

import { useCallback, useEffect, useState } from "react";

export default function MarcasPage() {
  const [marcas, setMarcas] = useState<string[]>([]);
  const [imagenes, setImagenes] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [rp, rt] = await Promise.all([
      fetch("/api/productos"),
      fetch("/api/tienda"),
    ]);
    const prods = rp.ok ? await rp.json() : [];
    const set = new Set<string>();
    for (const p of prods) if (p.marca && p.marca.trim()) set.add(p.marca);
    setMarcas([...set].sort());
    const tienda = rt.ok ? await rt.json() : null;
    const map =
      tienda && tienda.imagenesMarcas && typeof tienda.imagenesMarcas === "object"
        ? (tienda.imagenesMarcas as Record<string, string>)
        : {};
    setImagenes(map);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function guardar(map: Record<string, string>) {
    await fetch("/api/tienda", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagenesMarcas: map }),
    });
  }

  async function subir(marca: string, archivo: File) {
    setSubiendo(marca);
    try {
      const fd = new FormData();
      fd.append("file", archivo);
      fd.append("productoId", "marca");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      if (!r.ok) throw new Error("No se pudo subir la imagen");
      const d = await r.json();
      const nuevo = { ...imagenes, [marca]: d.url as string };
      setImagenes(nuevo);
      await guardar(nuevo);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al subir la imagen");
    } finally {
      setSubiendo(null);
    }
  }

  async function quitar(marca: string) {
    const nuevo = { ...imagenes };
    delete nuevo[marca];
    setImagenes(nuevo);
    await guardar(nuevo);
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Imágenes de marca</h1>
          <p className="mt-2 text-neutral-400">
            Asigna una imagen a cada marca para el catálogo. Si no pones una, se
            usa la foto de un producto de esa marca.
          </p>
        </div>

        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : marcas.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            Aún no tienes productos con marca.
          </p>
        ) : (
          <div className="space-y-2">
            {marcas.map((marca) => {
              const img = imagenes[marca];
              return (
                <div
                  key={marca}
                  className="flex flex-wrap items-center gap-4 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4"
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={marca}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-500">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  <p className="min-w-[100px] flex-1 font-semibold">{marca}</p>

                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200">
                      {subiendo === marca
                        ? "Subiendo..."
                        : img
                        ? "Cambiar"
                        : "Subir imagen"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) subir(marca, f);
                        }}
                      />
                    </label>
                    {img && (
                      <button
                        onClick={() => quitar(marca)}
                        className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-red-700 hover:text-red-400"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
