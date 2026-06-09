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
  colecciones: {
    coleccion: Coleccion;
  }[];
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
  const [cargando, setCargando] = useState(false);

  async function obtenerProductos() {
    const response = await fetch("/api/productos");
    const data = await response.json();
    setProductos(data);
  }

  async function obtenerColecciones() {
    const response = await fetch("/api/colecciones");
    const data = await response.json();
    setColecciones(data);

    if (data.length > 0) {
      setColeccionId(data[0].id);
    }
  }

  async function crearProducto(event: React.FormEvent<HTMLFormElement>) {
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

    await fetch("/api/productos", {
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

    setNombre("");
    setDescripcion("");
    setMarca("");
    setPrecio("");
    setCargando(false);
    obtenerProductos();
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
            Crea productos y asígnalos a una colección.
          </p>
        </div>

        <form
          onSubmit={crearProducto}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="text-xl font-semibold">Nuevo producto</h2>

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

          <button
            disabled={cargando}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar producto"}
          </button>
        </form>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Productos creados</h2>

          <div className="grid gap-4">
            {productos.map((producto) => (
              <article
                key={producto.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
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

                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                    {producto.estado}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}