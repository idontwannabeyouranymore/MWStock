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
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cargando, setCargando] = useState(false);

  async function obtenerColecciones() {
    const response = await fetch("/api/colecciones");
    const data = await response.json();

    const activas = data.filter(
      (coleccion: Coleccion) => coleccion.estado !== "ARCHIVADA"
    );

    setColecciones(activas);
  }

  function limpiarFormulario() {
    setEditandoId(null);
    setNombre("");
    setDescripcion("");
  }

  function cargarParaEditar(coleccion: Coleccion) {
    setEditandoId(coleccion.id);
    setNombre(coleccion.nombre);
    setDescripcion(coleccion.descripcion || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function guardarColeccion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nombre.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    setCargando(true);

    try {
      if (editandoId) {
        const response = await fetch(`/api/colecciones/${editandoId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nombre,
            descripcion,
          }),
        });

        if (!response.ok) {
          throw new Error("No se pudo editar la colección");
        }
      } else {
        const response = await fetch("/api/colecciones", {
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

        if (!response.ok) {
          throw new Error("No se pudo crear la colección");
        }
      }

      limpiarFormulario();
      await obtenerColecciones();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar la colección");
    } finally {
      setCargando(false);
    }
  }

  async function archivarColeccion(id: string) {
    const confirmar = confirm("¿Deseas archivar esta colección?");

    if (!confirmar) {
      return;
    }

    const response = await fetch(`/api/colecciones/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        estado: "ARCHIVADA",
      }),
    });

    if (!response.ok) {
      alert("No se pudo archivar la colección");
      return;
    }

    await obtenerColecciones();
  }

  useEffect(() => {
    obtenerColecciones();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">Colecciones</h1>

          <p className="mt-2 text-neutral-400">
            Crea, edita y archiva colecciones del catálogo.
          </p>
        </div>

        <form
          onSubmit={guardarColeccion}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="text-xl font-semibold">
            {editandoId ? "Editar colección" : "Nueva colección"}
          </h2>

          <input
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Nombre de la colección"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          <textarea
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Descripción"
            className="min-h-24 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
          />

          <div className="flex gap-3">
            <button
              disabled={cargando}
              className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
            >
              {cargando
                ? "Guardando..."
                : editandoId
                ? "Guardar cambios"
                : "Guardar colección"}
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
          <h2 className="text-xl font-semibold">Colecciones creadas</h2>

          {colecciones.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
              Todavía no hay colecciones activas.
            </p>
          ) : (
            <div className="grid gap-4">
              {colecciones.map((coleccion) => (
                <article
                  key={coleccion.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {coleccion.nombre}
                      </h3>

                      <p className="mt-1 text-sm text-neutral-400">
                        {coleccion.descripcion || "Sin descripción"}
                      </p>

                      <p className="mt-2 text-xs text-neutral-500">
                        Estado: {coleccion.estado}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => cargarParaEditar(coleccion)}
                        className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => archivarColeccion(coleccion.id)}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Archivar
                      </button>
                    </div>
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