"use client";

import { useEffect, useState } from "react";

type Coleccion = {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
};

const TIENDA_ID = "cmq67l6zl0002vw3os7n7qe30";

export default function ColeccionesPage() {
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(false);

  async function obtenerColecciones() {
    const response = await fetch("/api/colecciones");
    const data = await response.json();
    setColecciones(data);
  }

  async function crearColeccion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    setCargando(true);

    await fetch("/api/colecciones", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre,
        descripcion,
        tiendaId: TIENDA_ID,
      }),
    });

    setNombre("");
    setDescripcion("");
    setCargando(false);
    obtenerColecciones();
  }

  useEffect(() => {
    obtenerColecciones();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Colecciones
          </h1>

          <p className="mt-2 text-neutral-400">
            Crea y organiza secciones como Hoodies, Jeans, Promociones o Nuevos Ingresos.
          </p>
        </div>

        <form
          onSubmit={crearColeccion}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="text-xl font-semibold">
            Nueva colección
          </h2>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Nombre
            </label>

            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. Hoodies"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Ej. Sudaderas disponibles en tienda"
              className="min-h-24 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          <button
            disabled={cargando}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar colección"}
          </button>
        </form>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            Colecciones creadas
          </h2>

          {colecciones.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
              Todavía no hay colecciones.
            </p>
          ) : (
            <div className="grid gap-4">
              {colecciones.map((coleccion) => (
                <article
                  key={coleccion.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {coleccion.nombre}
                      </h3>

                      <p className="mt-1 text-sm text-neutral-400">
                        {coleccion.descripcion || "Sin descripción"}
                      </p>
                    </div>

                    <span className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300">
                      {coleccion.estado}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}