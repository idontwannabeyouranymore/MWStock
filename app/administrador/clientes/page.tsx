"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  nota: string | null;
  saldoTotal: number;
  deudasActivas: number;
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await fetch("/api/clientes");
    const data = r.ok ? await r.json() : [];
    setClientes(Array.isArray(data) ? data : []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      const r = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, nota }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al crear");
      setNombre("");
      setTelefono("");
      setNota("");
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  const filtrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalPorCobrar = clientes.reduce((s, c) => s + c.saldoTotal, 0);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Administrador
            </p>
            <h1 className="mt-2 text-3xl font-bold">Clientes</h1>
            <p className="mt-2 text-neutral-400">
              Lleva el control de quién te debe (fiado) y sus abonos.
            </p>
          </div>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-neutral-200"
          >
            {mostrarForm ? "Cerrar" : "+ Nuevo cliente"}
          </button>
        </div>

        {totalPorCobrar > 0 && (
          <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5">
            <p className="text-sm text-neutral-400">Total por cobrar (fiado)</p>
            <p className="mt-1 text-3xl font-bold text-amber-400">
              ${totalPorCobrar.toFixed(2)}
            </p>
          </div>
        )}

        {mostrarForm && (
          <form
            onSubmit={crear}
            className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
          >
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre *"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
            />
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="WhatsApp (ej. 5213312345678)"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
            />
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota (opcional)"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Guardar cliente"}
            </button>
          </form>
        )}

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 outline-none focus:border-white"
        />

        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : filtrados.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            No hay clientes todavía.
          </p>
        ) : (
          <div className="space-y-2">
            {filtrados.map((c) => (
              <Link
                key={c.id}
                href={`/administrador/clientes/${c.id}`}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4 transition hover:border-neutral-600"
              >
                <div>
                  <p className="font-semibold">{c.nombre}</p>
                  {c.telefono && (
                    <p className="text-sm text-neutral-500">{c.telefono}</p>
                  )}
                </div>
                <div className="text-right">
                  {c.saldoTotal > 0 ? (
                    <>
                      <p className="font-bold text-amber-400">
                        Debe ${c.saldoTotal.toFixed(2)}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {c.deudasActivas} deuda(s)
                      </p>
                    </>
                  ) : (
                    <span className="rounded-full bg-green-900/50 px-3 py-1 text-xs font-semibold text-green-400">
                      Al corriente
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
