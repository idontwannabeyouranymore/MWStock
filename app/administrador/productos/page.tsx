"use client";

import { useEffect, useState } from "react";

type Coleccion = {
  id: string;
  nombre: string;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  marca: string | null;
  precio: string;
  estado: string;
  destacado: boolean;
  imagenes: { id: string; url: string }[];
  colecciones: { coleccion: Coleccion }[];
};

const TIENDA_ID = "cmq67l6zl0002vw3os7n7qe30";

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marca, setMarca] = useState("");
  const [precio, setPrecio] = useState("");
  const [coleccionId, setColeccionId] = useState("");
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);

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

    setColecciones(data);

    if (data.length > 0) {
      setColeccionId(data[0].id);
    }
  }

  async function subirImagen(productoId: string, archivo: File) {
    const formData = new FormData();

    formData.append("file", archivo);
    formData.append("productoId", productoId);

    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("No se pudo subir la imagen");
    }

    const uploadData = await uploadResponse.json();

    await fetch(`/api/productos/${productoId}/imagenes`, {
      method: "DELETE",
    });

    const guardarResponse = await fetch(`/api/productos/${productoId}/imagenes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: uploadData.url,
        orden: 0,
      }),
    });

    if (!guardarResponse.ok) {
      throw new Error("No se pudo guardar la imagen");
    }
  }

  async function guardarProducto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    if (!precio || Number(precio) <= 0) {
      alert("El precio debe ser mayor a 0");
      return;
    }

    setCargando(true);

    try {
      if (editandoId) {
        const response = await fetch(`/api/productos/${editandoId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre,
            descripcion,
            marca,
            precio: Number(precio),
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo editar el producto");
        }

        if (archivoImagen) {
          await subirImagen(editandoId, archivoImagen);
        }
      } else {
        const response = await fetch("/api/productos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre,
            descripcion,
            marca,
            precio: Number(precio),
            tiendaId: TIENDA_ID,
            coleccionIds: coleccionId ? [coleccionId] : [],
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo crear el producto");
        }

        const productoCreado = await response.json();

        if (archivoImagen) {
          await subirImagen(productoCreado.id, archivoImagen);
        }
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
    setDescripcion("");
    setMarca("");
    setPrecio("");
    setArchivoImagen(null);
    setEditandoId(null);

    const inputArchivo = document.getElementById(
      "imagen-producto"
    ) as HTMLInputElement | null;

    if (inputArchivo) {
      inputArchivo.value = "";
    }
  }

  function cargarProductoParaEditar(producto: Producto) {
    setEditandoId(producto.id);
    setNombre(producto.nombre);
    setDescripcion(producto.descripcion || "");
    setMarca(producto.marca || "");
    setPrecio(String(producto.precio));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function archivarProducto(id: string) {
    const confirmar = confirm("¿Deseas archivar este producto?");

    if (!confirmar) return;

    const response = await fetch(`/api/productos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        estado: "ARCHIVADO",
      }),
    });

    if (!response.ok) {
      alert("No se pudo archivar el producto");
      return;
    }

    await obtenerProductos();
  }

  async function eliminarProducto(id: string) {
    const confirmar = confirm(
      "¿Seguro que deseas eliminar definitivamente este producto? Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    const response = await fetch(`/api/productos/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("No se pudo eliminar el producto");
      return;
    }

    await obtenerProductos();
  }

  async function cambiarDestacado(producto: Producto) {
    const response = await fetch(`/api/productos/${producto.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destacado: !producto.destacado,
      }),
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

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">Productos</h1>

          <p className="mt-2 text-neutral-400">
            Crea, edita, archiva, elimina y destaca productos.
          </p>
        </div>

        <form
          onSubmit={guardarProducto}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="text-xl font-semibold">
            {editandoId ? "Editar producto" : "Nuevo producto"}
          </h2>

          <input
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Nombre del producto"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          <input
            value={marca}
            onChange={(event) => setMarca(event.target.value)}
            placeholder="Marca"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          <input
            value={precio}
            onChange={(event) => setPrecio(event.target.value)}
            placeholder="Precio"
            type="number"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          <textarea
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Descripción"
            className="min-h-24 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          {!editandoId && (
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

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              {editandoId ? "Cambiar imagen" : "Imagen del producto"}
            </label>

            <input
              id="imagen-producto"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const archivo = event.target.files?.[0] ?? null;
                setArchivoImagen(archivo);
              }}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black"
            />
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

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Productos creados</h2>

          <div className="grid gap-4">
            {productos.map((producto) => {
              const imagenPrincipal = producto.imagenes?.[0];

              return (
                <article
                  key={producto.id}
                  className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
                >
                  <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                    <div className="flex h-40 items-center justify-center bg-neutral-800">
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
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {producto.nombre}
                          </h3>

                          <p className="text-sm text-neutral-400">
                            {producto.marca || "Sin marca"}
                          </p>

                          <p className="mt-2 text-neutral-300">
                            {producto.descripcion || "Sin descripción"}
                          </p>

                          <p className="mt-3 font-semibold">
                            ${Number(producto.precio).toFixed(2)}
                          </p>

                          <p className="mt-2 text-sm text-neutral-500">
                            Colección:{" "}
                            {producto.colecciones
                              .map((item) => item.coleccion.nombre)
                              .join(", ") || "Sin colección"}
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
                          Eliminar definitivamente
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}