"use client";

import { useEffect, useState } from "react";
import { urlDeTienda } from "@/lib/dominios";
import { MODULOS, type Modulos } from "@/lib/modulos";

type Tienda = {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
  tipo: string;
  modulos: Modulos;
  email: string | null;
  productos: number;
  stock: number;
  ventas: number;
  ingresos: number;
};

export default function DuenoPage() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug] = useState("");
  const [creando, setCreando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function cargar() {
    const response = await fetch("/api/dueno/tiendas");
    const data = await response.json();
    if (Array.isArray(data)) setTiendas(data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crearTienda(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreando(true);

    try {
      const response = await fetch("/api/dueno/tiendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear la tienda");
      }

      setNombre("");
      setEmail("");
      setPassword("");
      setSlug("");
      setMostrarForm(false);
      await cargar();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al crear la tienda");
    } finally {
      setCreando(false);
    }
  }

  async function alternarActiva(tienda: Tienda) {
    const accion = tienda.activa ? "suspender" : "reactivar";
    if (!confirm(`¿Seguro que deseas ${accion} "${tienda.nombre}"?`)) return;

    const response = await fetch(`/api/dueno/tiendas/${tienda.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !tienda.activa }),
    });

    if (!response.ok) {
      alert("No se pudo actualizar la tienda");
      return;
    }

    await cargar();
  }

  async function toggleModulo(tienda: Tienda, clave: keyof Modulos) {
    const nuevoValor = !tienda.modulos[clave];

    // Cambio optimista en pantalla.
    setTiendas((prev) =>
      prev.map((t) =>
        t.id === tienda.id
          ? { ...t, modulos: { ...t.modulos, [clave]: nuevoValor } }
          : t
      )
    );

    const response = await fetch(`/api/dueno/tiendas/${tienda.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modulos: { [clave]: nuevoValor } }),
    });

    if (!response.ok) {
      alert("No se pudo actualizar la herramienta");
      await cargar();
    }
  }

  const totalIngresos = tiendas.reduce((s, t) => s + t.ingresos, 0);
  const totalVentas = tiendas.reduce((s, t) => s + t.ventas, 0);
  const activas = tiendas.filter((t) => t.activa).length;

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-8 text-white">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">Tiendas</h2>
          <p className="mt-1 text-neutral-400">
            Resumen de todas las tiendas de la plataforma.
          </p>
        </div>

        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
        >
          {mostrarForm ? "Cerrar" : "Nueva tienda"}
        </button>
      </div>

      {/* Totales globales */}
      <section className="grid gap-4 sm:grid-cols-4">
        <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm text-neutral-400">Tiendas</p>
          <p className="mt-2 text-3xl font-bold">{tiendas.length}</p>
          <p className="text-xs text-neutral-500">{activas} activas</p>
        </article>
        <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm text-neutral-400">Ingresos totales</p>
          <p className="mt-2 text-3xl font-bold">${totalIngresos.toFixed(2)}</p>
        </article>
        <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm text-neutral-400">Ventas totales</p>
          <p className="mt-2 text-3xl font-bold">{totalVentas}</p>
        </article>
        <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <p className="text-sm text-neutral-400">Promedio por tienda</p>
          <p className="mt-2 text-3xl font-bold">
            $
            {tiendas.length > 0
              ? (totalIngresos / tiendas.length).toFixed(2)
              : "0.00"}
          </p>
        </article>
      </section>

      {/* Formulario nueva tienda */}
      {mostrarForm && (
        <form
          onSubmit={crearTienda}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h3 className="text-lg font-semibold">Crear tienda</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre de la tienda"
              className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug (ej. ropa-jr)"
              className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo del admin"
              type="email"
              className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña del admin"
              type="text"
              className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          <button
            disabled={creando}
            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {creando ? "Creando..." : "Crear tienda"}
          </button>
        </form>
      )}

      {/* Lista de tiendas */}
      {cargando ? (
        <p className="text-neutral-400">Cargando...</p>
      ) : tiendas.length === 0 ? (
        <p className="rounded-2xl border border-neutral-800 p-6 text-neutral-400">
          Todavía no hay tiendas.
        </p>
      ) : (
        <div className="grid gap-4">
          {tiendas.map((tienda) => (
            <article
              key={tienda.id}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold">{tienda.nombre}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        tienda.activa
                          ? "bg-green-900/50 text-green-400"
                          : "bg-red-900/50 text-red-400"
                      }`}
                    >
                      {tienda.activa ? "Activa" : "Suspendida"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-400">
                    {tienda.email} · /tienda/{tienda.slug}
                  </p>
                </div>

                <div className="flex gap-2">
                  <a
                    href={urlDeTienda(tienda.slug)}
                    target="_blank"
                    className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold"
                  >
                    Ver catálogo
                  </a>
                  <button
                    onClick={() => alternarActiva(tienda)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      tienda.activa
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                  >
                    {tienda.activa ? "Suspender" : "Reactivar"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-2xl font-bold">{tienda.productos}</p>
                  <p className="text-xs text-neutral-500">productos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{tienda.stock}</p>
                  <p className="text-xs text-neutral-500">en stock</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{tienda.ventas}</p>
                  <p className="text-xs text-neutral-500">ventas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    ${tienda.ingresos.toFixed(2)}
                  </p>
                  <p className="text-xs text-neutral-500">ingresos</p>
                </div>
              </div>

              {/* Herramientas activas de la tienda */}
              <div className="mt-5 border-t border-neutral-800 pt-4">
                <p className="text-sm font-semibold text-neutral-300">
                  Herramientas
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  Prende o apaga lo que esta tienda puede usar.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MODULOS.map((m) => {
                    const activo = tienda.modulos[m.clave];
                    return (
                      <button
                        key={m.clave}
                        onClick={() => toggleModulo(tienda, m.clave)}
                        title={m.descripcion}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          activo
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-neutral-800 text-neutral-500 hover:bg-neutral-700"
                        }`}
                      >
                        {activo ? "● " : "○ "}
                        {m.etiqueta}
                      </button>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
