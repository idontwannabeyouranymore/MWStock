"use client";

import { useCallback, useEffect, useState } from "react";

type Vendedor = {
  id: string;
  nombre: string;
  email: string;
  createdAt: string;
};

type EstadVendedor = {
  vendedor: string;
  hoy: { monto: number; ventas: number };
  mes: { monto: number; ventas: number };
  total: { monto: number; ventas: number };
};

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [stats, setStats] = useState<EstadVendedor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const [r, rs] = await Promise.all([
      fetch("/api/vendedores"),
      fetch("/api/vendedores/estadisticas"),
    ]);
    const data = r.ok ? await r.json() : [];
    setVendedores(Array.isArray(data) ? data : []);
    const ds = rs.ok ? await rs.json() : [];
    setStats(Array.isArray(ds) ? ds : []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !email.trim() || !password) {
      setError("Completa nombre, correo y contraseña.");
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch("/api/vendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al crear");
      setNombre("");
      setEmail("");
      setPassword("");
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(v: Vendedor) {
    if (!confirm(`¿Eliminar la cuenta de "${v.nombre}"?`)) return;
    const r = await fetch(`/api/vendedores/${v.id}`, { method: "DELETE" });
    if (!r.ok) {
      alert("No se pudo eliminar");
      return;
    }
    await cargar();
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Administrador
            </p>
            <h1 className="mt-2 text-3xl font-bold">Vendedores</h1>
            <p className="mt-2 text-neutral-400">
              Cuentas para tus empleados. Entran en la misma página de inicio de
              sesión y <strong>solo ven el Punto de venta</strong> (sin
              estadísticas).
            </p>
          </div>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-neutral-200"
          >
            {mostrarForm ? "Cerrar" : "+ Nuevo vendedor"}
          </button>
        </div>

        {mostrarForm && (
          <form
            onSubmit={crear}
            className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
          >
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del vendedor"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Correo (con el que inicia sesión)"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              placeholder="Contraseña (mínimo 6 caracteres)"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
            />
            {error && (
              <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {guardando ? "Creando..." : "Crear vendedor"}
            </button>
          </form>
        )}

        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : vendedores.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            Aún no tienes vendedores.
          </p>
        ) : (
          <div className="space-y-2">
            {vendedores.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4"
              >
                <div>
                  <p className="font-semibold">{v.nombre}</p>
                  <p className="text-sm text-neutral-500">{v.email}</p>
                </div>
                <button
                  onClick={() => borrar(v)}
                  className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-red-700 hover:text-red-400"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}

        {stats.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Ventas por vendedor</h2>
            <div className="overflow-hidden rounded-2xl border border-neutral-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-900 text-neutral-400">
                  <tr>
                    <th className="px-4 py-3">Vendedor</th>
                    <th className="px-4 py-3 text-right">Hoy</th>
                    <th className="px-4 py-3 text-right">Este mes</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s, i) => (
                    <tr
                      key={`${s.vendedor}-${i}`}
                      className="border-t border-neutral-800 bg-neutral-950"
                    >
                      <td className="px-4 py-3 font-semibold">{s.vendedor}</td>
                      <td className="px-4 py-3 text-right">
                        ${s.hoy.monto.toFixed(2)}
                        <span className="block text-xs text-neutral-500">
                          {s.hoy.ventas} venta(s)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${s.mes.monto.toFixed(2)}
                        <span className="block text-xs text-neutral-500">
                          {s.mes.ventas} venta(s)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${s.total.monto.toFixed(2)}
                        <span className="block text-xs text-neutral-500">
                          {s.total.ventas} venta(s)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-neutral-500">
              Las ventas hechas antes de esta actualización pueden aparecer como
              &quot;Sin asignar&quot;.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
