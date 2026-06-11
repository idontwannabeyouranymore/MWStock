"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Coleccion = {
  id: string;
  nombre: string;
};

type Variante = {
  id: string;
  talla: string;
  stock: number;
  estado: string;
};

// Talla en el formulario. Si tiene id, ya existe en la BD (modo edición).
type Talla = {
  id?: string;
  talla: string;
  stock: string;
};

type Producto = {
  id: string;
  nombre: string;
  precio: string;
  estado: string;
  destacado: boolean;
  imagenes: { id: string; url: string }[];
  variantes: Variante[];
  colecciones: { coleccion: Coleccion }[];
};

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [coleccionId, setColeccionId] = useState("");

  const [tallas, setTallas] = useState<Talla[]>([]);
  const [tallaInput, setTallaInput] = useState("");
  const [stockInput, setStockInput] = useState("");
  const [tallasEliminadas, setTallasEliminadas] = useState<string[]>([]);

  const [archivos, setArchivos] = useState<File[]>([]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function obtenerProductos() {
    const response = await fetch("/api/productos");
    const data = await response.json();

    setProductos(
      data.filter((producto: Producto) => producto.estado !== "ARCHIVADO")
    );
  }

  async function obtenerColecciones() {
    const response = await fetch("/api/colecciones");
    const data = await response.json();

    const activas = data.filter(
      (coleccion: { estado?: string }) => coleccion.estado !== "ARCHIVADA"
    );

    setColecciones(activas);

    if (activas.length > 0) {
      setColeccionId((actual) => actual || activas[0].id);
    }
  }

  // --- Tallas ---
  function agregarTalla() {
    if (!tallaInput.trim()) {
      alert("Escribe una talla");
      return;
    }

    const stockNumero = stockInput === "" ? 0 : Number(stockInput);

    if (Number.isNaN(stockNumero) || stockNumero < 0) {
      alert("El stock debe ser 0 o mayor");
      return;
    }

    setTallas([
      ...tallas,
      { talla: tallaInput.trim(), stock: String(stockNumero) },
    ]);
    setTallaInput("");
    setStockInput("");
  }

  function quitarTalla(indice: number) {
    const talla = tallas[indice];

    if (talla.id) {
      setTallasEliminadas([...tallasEliminadas, talla.id]);
    }

    setTallas(tallas.filter((_, i) => i !== indice));
  }

  function cambiarStockTalla(indice: number, valor: string) {
    setTallas(
      tallas.map((talla, i) =>
        i === indice ? { ...talla, stock: valor } : talla
      )
    );
  }

  // --- Guardado ---
  async function sincronizarTallas(productoId: string) {
    for (const talla of tallas) {
      const stock = talla.stock === "" ? 0 : Number(talla.stock);

      if (talla.id) {
        await fetch(`/api/variantes/${talla.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ talla: talla.talla, stock }),
        });
      } else {
        await fetch("/api/variantes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productoId, talla: talla.talla, stock }),
        });
      }
    }

    for (const id of tallasEliminadas) {
      await fetch(`/api/variantes/${id}`, { method: "DELETE" });
    }
  }

  async function subirFotos(productoId: string) {
    for (const archivo of archivos) {
      const formData = new FormData();
      formData.append("file", archivo);
      formData.append("productoId", productoId);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("No se pudo subir una imagen");
      }

      const uploadData = await uploadResponse.json();

      await fetch(`/api/productos/${productoId}/imagenes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: uploadData.url }),
      });
    }
  }

  async function guardarProducto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!coleccionId && !editandoId) {
      alert("Elige una colección");
      return;
    }

    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    if (!precio || Number(precio) <= 0) {
      alert("El precio debe ser mayor a 0");
      return;
    }

    if (tallas.length === 0) {
      alert("Agrega al menos una talla");
      return;
    }

    setCargando(true);

    try {
      let productoId = editandoId;

      if (editandoId) {
        const response = await fetch(`/api/productos/${editandoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre, precio: Number(precio) }),
        });

        if (!response.ok) {
          throw new Error("No se pudo editar el producto");
        }
      } else {
        const response = await fetch("/api/productos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre,
            precio: Number(precio),
            coleccionIds: coleccionId ? [coleccionId] : [],
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo crear el producto");
        }

        const creado = await response.json();
        productoId = creado.id;
      }

      await sincronizarTallas(productoId as string);

      if (archivos.length > 0) {
        await subirFotos(productoId as string);
      }

      limpiarFormulario();
      await obtenerProductos();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar el producto");
    } finally {
      setCargando(false);
    }
  }

  function limpiarFormulario() {
    setNombre("");
    setPrecio("");
    setTallas([]);
    setTallaInput("");
    setStockInput("");
    setTallasEliminadas([]);
    setArchivos([]);
    setEditandoId(null);

    if (colecciones.length > 0) {
      setColeccionId(colecciones[0].id);
    }

    const inputArchivo = document.getElementById(
      "fotos-producto"
    ) as HTMLInputElement | null;

    if (inputArchivo) {
      inputArchivo.value = "";
    }
  }

  function cargarProductoParaEditar(producto: Producto) {
    setEditandoId(producto.id);
    setNombre(producto.nombre);
    setPrecio(String(producto.precio));
    setColeccionId(producto.colecciones[0]?.coleccion.id ?? "");
    setTallas(
      producto.variantes
        .filter((variante) => variante.estado !== "ARCHIVADA")
        .map((variante) => ({
          id: variante.id,
          talla: variante.talla,
          stock: String(variante.stock),
        }))
    );
    setTallasEliminadas([]);
    setArchivos([]);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function archivarProducto(id: string) {
    if (!confirm("¿Deseas archivar este producto?")) return;

    const response = await fetch(`/api/productos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "ARCHIVADO" }),
    });

    if (!response.ok) {
      alert("No se pudo archivar el producto");
      return;
    }

    await obtenerProductos();
  }

  async function eliminarProducto(id: string) {
    if (
      !confirm(
        "¿Seguro que deseas eliminar definitivamente este producto? Esta acción no se puede deshacer."
      )
    )
      return;

    const response = await fetch(`/api/productos/${id}`, { method: "DELETE" });

    if (!response.ok) {
      alert("No se pudo eliminar el producto");
      return;
    }

    await obtenerProductos();
  }

  async function cambiarDestacado(producto: Producto) {
    const response = await fetch(`/api/productos/${producto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destacado: !producto.destacado }),
    });

    if (!response.ok) {
      alert("No se pudo actualizar destacado");
      return;
    }

    await obtenerProductos();
  }

  useEffect(() => {
    obtenerProductos();
    obtenerColecciones();
  }, []);

  const nombreColeccionEditando =
    editandoId && tallas
      ? productos.find((p) => p.id === editandoId)?.colecciones[0]?.coleccion
          .nombre
      : null;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">Productos</h1>

          <p className="mt-2 text-neutral-400">
            Elige la colección, ponle nombre, precio, tallas y fotos. Todo en un
            solo paso.
          </p>
        </div>

        {colecciones.length === 0 ? (
          <p className="rounded-2xl border border-yellow-700 bg-yellow-950/40 p-5 text-yellow-200">
            Primero crea una colección en la sección{" "}
            <Link href="/administrador/colecciones" className="underline">
              Colecciones
            </Link>{" "}
            para poder subir productos.
          </p>
        ) : (
          <form
            onSubmit={guardarProducto}
            className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
          >
            <h2 className="text-xl font-semibold">
              {editandoId ? "Editar producto" : "Nuevo producto"}
            </h2>

            {/* Colección */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Colección</label>

              {editandoId ? (
                <p className="rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-neutral-400">
                  {nombreColeccionEditando || "Sin colección"}
                </p>
              ) : (
                <select
                  value={coleccionId}
                  onChange={(event) => setColeccionId(event.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
                >
                  {colecciones.map((coleccion) => (
                    <option key={coleccion.id} value={coleccion.id}>
                      {coleccion.nombre}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Nombre</label>
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Nombre del producto"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">Precio</label>
              <input
                value={precio}
                onChange={(event) => setPrecio(event.target.value)}
                placeholder="0.00"
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
              />
            </div>

            {/* Tallas */}
            <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <label className="text-sm text-neutral-300">
                Tallas y stock
              </label>

              <div className="flex flex-wrap gap-2">
                <input
                  value={tallaInput}
                  onChange={(event) => setTallaInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      agregarTalla();
                    }
                  }}
                  placeholder="Talla (M, L, 32...)"
                  className="min-w-32 flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                />

                <input
                  value={stockInput}
                  onChange={(event) => setStockInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      agregarTalla();
                    }
                  }}
                  placeholder="Stock"
                  type="number"
                  min="0"
                  className="w-28 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                />

                <button
                  type="button"
                  onClick={agregarTalla}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
                >
                  Agregar
                </button>
              </div>

              {tallas.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Agrega al menos una talla con su stock.
                </p>
              ) : (
                <div className="space-y-2">
                  {tallas.map((talla, indice) => (
                    <div
                      key={talla.id ?? `nueva-${indice}`}
                      className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2"
                    >
                      <span className="font-semibold">{talla.talla}</span>

                      <span className="text-sm text-neutral-400">stock:</span>

                      <input
                        value={talla.stock}
                        onChange={(event) =>
                          cambiarStockTalla(indice, event.target.value)
                        }
                        type="number"
                        min="0"
                        className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1 text-white outline-none focus:border-white"
                      />

                      <button
                        type="button"
                        onClick={() => quitarTalla(indice)}
                        className="ml-auto rounded-lg bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fotos */}
            <div className="space-y-2">
              <label className="text-sm text-neutral-300">
                {editandoId ? "Agregar más fotos" : "Fotos del producto"}
              </label>

              <input
                id="fotos-producto"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  setArchivos(Array.from(event.target.files ?? []))
                }
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black"
              />

              {archivos.length > 0 && (
                <p className="text-xs text-neutral-400">
                  {archivos.length} foto(s) seleccionada(s)
                </p>
              )}

              {editandoId && (
                <p className="text-xs text-neutral-500">
                  Para ver o borrar las fotos ya subidas, usa el botón
                  &quot;Imágenes&quot; del producto.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                disabled={cargando}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
              >
                {cargando
                  ? "Guardando..."
                  : editandoId
                  ? "Guardar cambios"
                  : "Guardar producto"}
              </button>

              {editandoId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-white"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Productos creados</h2>

          {productos.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
              Todavía no hay productos.
            </p>
          ) : (
            <div className="grid gap-4">
              {productos.map((producto) => {
                const imagenPrincipal = producto.imagenes?.[0];
                const tallasActivas = producto.variantes.filter(
                  (variante) => variante.estado !== "ARCHIVADA"
                );

                return (
                  <article
                    key={producto.id}
                    className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
                  >
                    <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                      <div className="relative flex h-40 items-center justify-center bg-neutral-800">
                        {imagenPrincipal ? (
                          <img
                            src={imagenPrincipal.url}
                            alt={producto.nombre}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm text-neutral-500">
                            Sin imagen
                          </span>
                        )}

                        {producto.imagenes?.length > 1 && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-xs">
                            {producto.imagenes.length} fotos
                          </span>
                        )}
                      </div>

                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {producto.nombre}
                            </h3>

                            <p className="mt-2 font-semibold">
                              ${Number(producto.precio).toFixed(2)}
                            </p>

                            <p className="mt-2 text-sm text-neutral-500">
                              Colección:{" "}
                              {producto.colecciones
                                .map((item) => item.coleccion.nombre)
                                .join(", ") || "Sin colección"}
                            </p>

                            <p className="mt-2 text-sm text-neutral-400">
                              Tallas:{" "}
                              {tallasActivas.length > 0
                                ? tallasActivas
                                    .map(
                                      (variante) =>
                                        `${variante.talla} (${variante.stock})`
                                    )
                                    .join(", ")
                                : "Sin tallas"}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                              {producto.estado}
                            </span>

                            {producto.destacado && (
                              <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-black">
                                Destacado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => cargarProductoParaEditar(producto)}
                            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
                          >
                            Editar
                          </button>

                          <Link
                            href={`/administrador/productos/${producto.id}/imagenes`}
                            className="rounded-lg bg-neutral-200 px-4 py-2 text-sm font-semibold text-black hover:bg-white"
                          >
                            Imágenes
                          </Link>

                          <button
                            onClick={() => cambiarDestacado(producto)}
                            className="rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black"
                          >
                            {producto.destacado
                              ? "Quitar destacado"
                              : "Destacar"}
                          </button>

                          <button
                            onClick={() => archivarProducto(producto.id)}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                          >
                            Archivar
                          </button>

                          <button
                            onClick={() => eliminarProducto(producto.id)}
                            className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-950"
                          >
                            Eliminar
                          </button>
                        </div>
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
