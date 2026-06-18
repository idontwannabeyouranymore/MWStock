"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Variante = {
  id: string;
  talla: string;
  stock: number;
  estado: string;
};

type Producto = {
  id: string;
  nombre: string;
  esSet?: boolean;
  variantes: Variante[];
};

type Coleccion = { id: string; nombre: string };

type ComponenteForm = {
  varianteId: string;
  label: string;
};

type SetExistente = {
  id: string;
  nombre: string;
  precio: string;
  imagenes: { url: string }[];
  colecciones: { coleccion: { nombre: string } }[];
  componentes: {
    id: string;
    cantidad: number;
    variante: {
      talla: string;
      stock: number;
      producto: { nombre: string };
    };
  }[];
};

export default function SetsPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);
  const [sets, setSets] = useState<SetExistente[]>([]);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [coleccionId, setColeccionId] = useState("");
  const [componentes, setComponentes] = useState<ComponenteForm[]>([]);
  const [archivos, setArchivos] = useState<File[]>([]);

  const [productoSel, setProductoSel] = useState("");
  const [varianteSel, setVarianteSel] = useState("");
  const [cargando, setCargando] = useState(false);

  async function cargarTodo() {
    const [pRes, cRes, sRes] = await Promise.all([
      fetch("/api/productos"),
      fetch("/api/colecciones"),
      fetch("/api/sets"),
    ]);
    const pData: Producto[] = await pRes.json();
    const cData = await cRes.json();
    const sData = await sRes.json();

    const normales = pData.filter((p) => !p.esSet);
    setProductos(normales);

    const activas = cData.filter(
      (c: { estado?: string }) => c.estado !== "ARCHIVADA"
    );
    setColecciones(activas);
    if (activas.length > 0) setColeccionId((a) => a || activas[0].id);

    if (Array.isArray(sData)) setSets(sData);

    if (normales.length > 0) setProductoSel((a) => a || normales[0].id);
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  const productoActual = productos.find((p) => p.id === productoSel);
  const variantesDisponibles =
    productoActual?.variantes.filter((v) => v.estado !== "ARCHIVADA") ?? [];

  function agregarComponente() {
    if (!varianteSel) {
      alert("Elige una presentación");
      return;
    }
    if (componentes.some((c) => c.varianteId === varianteSel)) {
      alert("Esa presentación ya está en el set");
      return;
    }
    const v = variantesDisponibles.find((x) => x.id === varianteSel);
    if (!productoActual || !v) return;

    setComponentes([
      ...componentes,
      {
        varianteId: varianteSel,
        label: `${productoActual.nombre} — ${v.talla}`,
      },
    ]);
    setVarianteSel("");
  }

  function quitarComponente(varianteId: string) {
    setComponentes(componentes.filter((c) => c.varianteId !== varianteId));
  }

  async function subirFotos(setId: string) {
    for (const archivo of archivos) {
      const formData = new FormData();
      formData.append("file", archivo);
      formData.append("productoId", setId);
      const up = await fetch("/api/upload", { method: "POST", body: formData });
      if (!up.ok) continue;
      const data = await up.json();
      await fetch(`/api/productos/${setId}/imagenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: data.url }),
      });
    }
  }

  async function guardarSet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nombre.trim()) return alert("Ponle nombre al set");
    if (!precio || Number(precio) <= 0) return alert("Pon el precio del set");
    if (componentes.length === 0) return alert("Agrega al menos un componente");

    setCargando(true);
    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          precio: Number(precio),
          coleccionIds: coleccionId ? [coleccionId] : [],
          componentes: componentes.map((c) => ({
            varianteId: c.varianteId,
            cantidad: 1,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear el set");

      if (archivos.length > 0) await subirFotos(data.id);

      setNombre("");
      setPrecio("");
      setComponentes([]);
      setArchivos([]);
      const input = document.getElementById(
        "fotos-set"
      ) as HTMLInputElement | null;
      if (input) input.value = "";

      await cargarTodo();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al crear el set");
    } finally {
      setCargando(false);
    }
  }

  async function eliminarSet(id: string) {
    if (!confirm("¿Eliminar este set?")) return;
    const response = await fetch(`/api/sets/${id}`, { method: "DELETE" });
    if (!response.ok) {
      alert("No se pudo eliminar el set");
      return;
    }
    await cargarTodo();
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Sets (paquetes)</h1>
          <p className="mt-2 text-neutral-400">
            Arma paquetes con varios decants. Si a un componente se le acaba el
            stock, el set se marca como agotado automáticamente.
          </p>
        </div>

        {productos.length === 0 ? (
          <p className="rounded-2xl border border-yellow-700 bg-yellow-950/40 p-5 text-yellow-200">
            Primero crea productos con sus presentaciones en{" "}
            <Link href="/administrador/productos" className="underline">
              Productos
            </Link>{" "}
            para poder armar sets con ellos.
          </p>
        ) : (
          <form
            onSubmit={guardarSet}
            className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
          >
            <h2 className="text-xl font-semibold">Nuevo set</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Nombre</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Set Citas"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">
                  Precio del set
                </label>
                <input
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                />
              </div>
            </div>

            {colecciones.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm text-neutral-300">Categoría</label>
                <select
                  value={coleccionId}
                  onChange={(e) => setColeccionId(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                >
                  {colecciones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Componentes */}
            <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <label className="text-sm text-neutral-300">
                Componentes del set (decants)
              </label>

              <div className="flex flex-wrap gap-2">
                <select
                  value={productoSel}
                  onChange={(e) => {
                    setProductoSel(e.target.value);
                    setVarianteSel("");
                  }}
                  className="min-w-40 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-3 text-white outline-none focus:border-white"
                >
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>

                <select
                  value={varianteSel}
                  onChange={(e) => setVarianteSel(e.target.value)}
                  className="min-w-32 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-3 text-white outline-none focus:border-white"
                >
                  <option value="">Presentación...</option>
                  {variantesDisponibles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.talla} (stock {v.stock})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={agregarComponente}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
                >
                  Agregar
                </button>
              </div>

              {componentes.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Agrega los decants que forman el set.
                </p>
              ) : (
                <div className="space-y-2">
                  {componentes.map((c) => (
                    <div
                      key={c.varianteId}
                      className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2"
                    >
                      <span className="text-sm">{c.label}</span>
                      <button
                        type="button"
                        onClick={() => quitarComponente(c.varianteId)}
                        className="ml-auto rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Fotos del set</label>
              <input
                id="fotos-set"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setArchivos(Array.from(e.target.files ?? []))}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black"
              />
            </div>

            <button
              disabled={cargando}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
            >
              {cargando ? "Guardando..." : "Guardar set"}
            </button>
          </form>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Sets creados</h2>

          {sets.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
              Todavía no hay sets.
            </p>
          ) : (
            <div className="grid gap-4">
              {sets.map((set) => {
                const agotado = set.componentes.some(
                  (c) => c.variante.stock < c.cantidad
                );
                return (
                  <article
                    key={set.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold">{set.nombre}</h3>
                        <p className="mt-1 font-semibold">
                          ${Number(set.precio).toFixed(2)}
                        </p>
                        <p className="mt-2 text-sm text-neutral-400">
                          Incluye:{" "}
                          {set.componentes
                            .map(
                              (c) =>
                                `${c.variante.producto.nombre} ${c.variante.talla}`
                            )
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            agotado
                              ? "bg-red-900/50 text-red-400"
                              : "bg-green-900/50 text-green-400"
                          }`}
                        >
                          {agotado ? "Agotado" : "Disponible"}
                        </span>
                        <button
                          onClick={() => eliminarSet(set.id)}
                          className="rounded-lg border border-red-600 px-3 py-1 text-sm font-semibold text-red-400 hover:bg-red-950"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
