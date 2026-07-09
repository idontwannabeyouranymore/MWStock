"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { promoVigente } from "@/lib/promos";

type Promo = {
  id: string;
  nombre: string;
  porcentaje: number;
  alcance: "TIENDA" | "COLECCION" | "MARCA";
  coleccionId: string | null;
  marca: string | null;
  inicio: string;
  fin: string;
  activa: boolean;
};
type Coleccion = { id: string; nombre: string };

function soloFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PromocionesPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [alcance, setAlcance] = useState<"TIENDA" | "COLECCION" | "MARCA">(
    "TIENDA"
  );
  const [coleccionId, setColeccionId] = useState("");
  const [marca, setMarca] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const [rp, rc, rpr] = await Promise.all([
      fetch("/api/promociones"),
      fetch("/api/colecciones"),
      fetch("/api/productos"),
    ]);
    setPromos(rp.ok ? await rp.json() : []);
    setColecciones(rc.ok ? await rc.json() : []);
    const prods = rpr.ok ? await rpr.json() : [];
    const set = new Set<string>();
    for (const p of prods) if (p.marca && p.marca.trim()) set.add(p.marca);
    setMarcas([...set].sort());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreColeccion = useMemo(() => {
    const m = new Map(colecciones.map((c) => [c.id, c.nombre]));
    return (id: string | null) => (id ? m.get(id) || "—" : "—");
  }, [colecciones]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !porcentaje || !inicio || !fin) {
      setError("Completa nombre, porcentaje y fechas.");
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch("/api/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          porcentaje: Number(porcentaje),
          alcance,
          coleccionId: alcance === "COLECCION" ? coleccionId : null,
          marca: alcance === "MARCA" ? marca : null,
          inicio: inicio + "T00:00:00",
          fin: fin + "T23:59:59",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo crear");
      setNombre("");
      setPorcentaje("");
      setAlcance("TIENDA");
      setColeccionId("");
      setMarca("");
      setInicio("");
      setFin("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function toggle(p: Promo) {
    await fetch(`/api/promociones/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !p.activa }),
    });
    await cargar();
  }

  async function borrar(p: Promo) {
    if (!confirm(`¿Eliminar la promoción "${p.nombre}"?`)) return;
    await fetch(`/api/promociones/${p.id}`, { method: "DELETE" });
    await cargar();
  }

  function estado(p: Promo) {
    if (!p.activa) return { txt: "Inactiva", cls: "bg-neutral-800 text-neutral-400" };
    if (promoVigente(p)) return { txt: "Vigente", cls: "bg-green-900/50 text-green-400" };
    if (new Date(p.inicio) > new Date())
      return { txt: "Programada", cls: "bg-blue-900/50 text-blue-300" };
    return { txt: "Terminada", cls: "bg-neutral-800 text-neutral-500" };
  }

  function alcanceTxt(p: Promo) {
    if (p.alcance === "TIENDA") return "Toda la tienda";
    if (p.alcance === "COLECCION")
      return "Colección: " + nombreColeccion(p.coleccionId);
    return "Marca: " + (p.marca || "—");
  }

  const inputCls =
    "w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white";

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Promociones</h1>
          <p className="mt-2 text-neutral-400">
            Aplica un descuento a una colección, a una marca o a toda la tienda,
            dentro de un rango de fechas. Se aplica solo en el punto de venta y
            en el catálogo, y se quita al terminar.
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={crear}
          className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="font-semibold">Nueva promoción</h2>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre (ej. Fin de semana Gorras)"
            className={inputCls}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-neutral-400">Descuento (%)</span>
              <input
                type="number"
                min="1"
                max="100"
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                placeholder="Ej. 20"
                className={inputCls + " mt-1"}
              />
            </label>
            <label className="text-sm">
              <span className="text-neutral-400">Aplica a</span>
              <select
                value={alcance}
                onChange={(e) =>
                  setAlcance(e.target.value as "TIENDA" | "COLECCION" | "MARCA")
                }
                className={inputCls + " mt-1"}
              >
                <option value="TIENDA">Toda la tienda</option>
                <option value="COLECCION">Una colección</option>
                <option value="MARCA">Una marca</option>
              </select>
            </label>
          </div>

          {alcance === "COLECCION" && (
            <select
              value={coleccionId}
              onChange={(e) => setColeccionId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Elige la colección —</option>
              {colecciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
          {alcance === "MARCA" && (
            <>
              <input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Marca (elige de la lista)"
                list="marcas-promo"
                className={inputCls}
              />
              <datalist id="marcas-promo">
                {marcas.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-neutral-400">Inicio</span>
              <input
                type="date"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
                className={inputCls + " mt-1"}
              />
            </label>
            <label className="text-sm">
              <span className="text-neutral-400">Fin</span>
              <input
                type="date"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className={inputCls + " mt-1"}
              />
            </label>
          </div>

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
            {guardando ? "Guardando..." : "Crear promoción"}
          </button>
        </form>

        {/* Lista */}
        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : promos.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            Aún no tienes promociones.
          </p>
        ) : (
          <div className="space-y-2">
            {promos.map((p) => {
              const est = estado(p);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4"
                >
                  <div>
                    <p className="font-semibold">
                      {p.nombre}{" "}
                      <span className="text-green-400">
                        −{p.porcentaje}%
                      </span>
                    </p>
                    <p className="text-sm text-neutral-400">
                      {alcanceTxt(p)} · {soloFecha(p.inicio)} a{" "}
                      {soloFecha(p.fin)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${est.cls}`}
                    >
                      {est.txt}
                    </span>
                    <button
                      onClick={() => toggle(p)}
                      className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-white"
                    >
                      {p.activa ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => borrar(p)}
                      className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-red-700 hover:text-red-400"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
