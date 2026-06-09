"use client";

import { useEffect, useState } from "react";

type Producto = {
  id: string;
  nombre: string;
};

type Variante = {
  id: string;
  talla: string;
  color: string | null;
  stock: number;
  estado: string;
  producto: Producto;
};

export default function VariantesPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [variantes, setVariantes] = useState<Variante[]>([]);

  const [productoId, setProductoId] = useState("");
  const [talla, setTalla] = useState("");
  const [color, setColor] = useState("");
  const [stock, setStock] = useState("");
  const [cargando, setCargando] = useState(false);

  async function obtenerProductos() {
    const response = await fetch("/api/productos");
    const data = await response.json();

    setProductos(data);

    if (data.length > 0) {
      setProductoId(data[0].id);
    }
  }

  async function obtenerVariantes() {
    const response = await fetch("/api/variantes");
    const data = await response.json();
    setVariantes(data);
  }

  async function crearVariante(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!productoId) {
      alert("Selecciona un producto");
      return;
    }

    if (!talla.trim()) {
      alert("La talla es obligatoria");
      return;
    }

    if (stock === "" || Number(stock) < 0) {
      alert("El stock debe ser 0 o mayor");
      return;
    }

    setCargando(true);

    await fetch("/api/variantes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productoId,
        talla,
        color,
        stock: Number(stock),
      }),
    });

    setTalla("");
    setColor("");
    setStock("");
    setCargando(false);
    obtenerVariantes();
  }

  useEffect(() => {
    obtenerProductos();
    obtenerVariantes();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">Variantes</h1>

          <p className="mt-2 text-neutral-400">
            Agrega tallas, colores y stock para cada producto.
          </p>
        </div>

        <form
          onSubmit={crearVariante}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="text-xl font-semibold">Nueva variante</h2>

          <select
            value={productoId}
            onChange={(event) => setProductoId(event.target.value)}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          >
            {productos.map((producto) => (
              <option key={producto.id} value={producto.id}>
                {producto.nombre}
              </option>
            ))}
          </select>

          <input
            value={talla}
            onChange={(event) => setTalla(event.target.value)}
            placeholder="Talla. Ej. M, L, XL, 32"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          <input
            value={color}
            onChange={(event) => setColor(event.target.value)}
            placeholder="Color. Ej. Negro"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          <input
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            placeholder="Stock"
            type="number"
            min="0"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          <button
            disabled={cargando}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar variante"}
          </button>
        </form>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Variantes creadas</h2>

          <div className="grid gap-4">
            {variantes.map((variante) => (
              <article
                key={variante.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {variante.producto.nombre}
                    </h3>

                    <p className="mt-1 text-sm text-neutral-400">
                      Talla: {variante.talla}
                    </p>

                    <p className="text-sm text-neutral-400">
                      Color: {variante.color || "Sin color"}
                    </p>

                    <p className="mt-3 font-semibold">
                      Stock: {variante.stock}
                    </p>
                  </div>

                  <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                    {variante.estado}
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