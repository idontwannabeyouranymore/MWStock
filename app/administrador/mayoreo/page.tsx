"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Nivel = { min: number; tipo: "porcentaje" | "precio"; valor: number };
type Mayoreo = {
  id: string;
  alcance: "COLECCION" | "MARCA";
  coleccionId: string | null;
  marca: string | null;
  niveles: Nivel[];
  activo: boolean;
};
type Coleccion = { id: string; nombre: string };

type NivelForm = { min: string; tipo: "porcentaje" | "precio"; valor: string };

export default function MayoreoPage() {
  const [items, setItems] = useState<Mayoreo[]>([]);
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);

  const [alcance, setAlcance] = useState<"COLECCION" | "MARCA">("COLECCION");
  const [coleccionId, setColeccionId] = useState("");
  const [marca, setMarca] = useState("");
  const [niveles, setNiveles] = useState<NivelForm[]>([
    { min: "", tipo: "porcentaje", valor: "" },
  ]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const [rm, rc, rp] = await Promise.all([
      fetch("/api/mayoreo"),
      fetch("/api/colecciones"),
      fetch("/api/productos"),
    ]);
    setItems(rm.ok ? await rm.json() : []);
    setColecciones(rc.ok ? await rc.json() : []);
    const prods = rp.ok ? await rp.json() : [];
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

  function setNivel(i: number, patch: Partial<NivelForm>) {
    setNiveles((ns) => ns.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));
  }
  function agregarNivel() {
    setNiveles((ns) => [...ns, { min: "", tipo: "porcentaje", valor: "" }]);
  }
  function quitarNivel(i: number) {
    setNiveles((ns) => (ns.length === 1 ? ns : ns.filter((_, idx) => idx !== i)));
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const nivelesNum = niveles
      .filter((n) => n.min && n.valor)
      .map((n) => ({
        min: Number(n.min),
        tipo: n.tipo,
        valor: Number(n.valor),
      }));
    if (nivelesNum.length === 0) {
      setError("Agrega al menos un nivel (cantidad y valor).");
      return;
    }
    if (alcance === "COLECCION" && !coleccionId) {
      setError("Elige la colección.");
      return;
    }
    if (alcance === "MARCA" && !marca.trim()) {
      setError("Escribe la marca.");
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch("/api/mayoreo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alcance,
          coleccionId: alcance === "COLECCION" ? coleccionId : null,
          marca: alcance === "MARCA" ? marca : null,
          niveles: nivelesNum,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo crear");
      setAlcance("COLECCION");
      setColeccionId("");
      setMarca("");
      setNiveles([{ min: "", tipo: "porcentaje", valor: "" }]);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  async function toggle(m: Mayoreo) {
    await fetch(`/api/mayoreo/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !m.activo }),
    });
    await cargar();
  }
  async function borrar(m: Mayoreo) {
    if (!confirm("¿Eliminar esta configuración de mayoreo?")) return;
    await fetch(`/api/mayoreo/${m.id}`, { method: "DELETE" });
    await cargar();
  }

  function nivelTxt(n: Nivel) {
    return n.tipo === "porcentaje"
      ? `Desde ${n.min} pzas: −${n.valor}%`
      : `Desde ${n.min} pzas: $${n.valor} c/u`;
  }

  const inp =
    "w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white";

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Mayoreo</h1>
          <p className="mt-2 text-neutral-400">
            Elige colecciones o marcas para vender por mayoreo y define el precio
            por cantidad (por producto). Se crea un catálogo de mayoreo aparte
            que reutiliza tus mismos productos.
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={crear}
          className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="font-semibold">Nueva regla de mayoreo</h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-neutral-400">Aplica a</span>
              <select
                value={alcance}
                onChange={(e) =>
                  setAlcance(e.target.value as "COLECCION" | "MARCA")
                }
                className={inp + " mt-1"}
              >
                <option value="COLECCION">Una colección</option>
                <option value="MARCA">Una marca</option>
              </select>
            </label>
            {alcance === "COLECCION" ? (
              <label className="text-sm">
                <span className="text-neutral-400">Colección</span>
                <select
                  value={coleccionId}
                  onChange={(e) => setColeccionId(e.target.value)}
                  className={inp + " mt-1"}
                >
                  <option value="">— Elige —</option>
                  {colecciones.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-sm">
                <span className="text-neutral-400">Marca</span>
                <input
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  list="marcas-may"
                  placeholder="Elige de la lista"
                  className={inp + " mt-1"}
                />
                <datalist id="marcas-may">
                  {marcas.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-300">
              Niveles de precio (por cantidad de un mismo producto)
            </p>
            {niveles.map((n, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-neutral-500">Desde</span>
                <input
                  type="number"
                  min="1"
                  value={n.min}
                  onChange={(e) => setNivel(i, { min: e.target.value })}
                  placeholder="5"
                  className="w-20 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                />
                <span className="text-sm text-neutral-500">pzas:</span>
                <select
                  value={n.tipo}
                  onChange={(e) =>
                    setNivel(i, {
                      tipo: e.target.value as "porcentaje" | "precio",
                    })
                  }
                  className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                >
                  <option value="porcentaje">Descuento %</option>
                  <option value="precio">Precio fijo c/u</option>
                </select>
                <input
                  type="number"
                  min="0"
                  value={n.valor}
                  onChange={(e) => setNivel(i, { valor: e.target.value })}
                  placeholder={n.tipo === "porcentaje" ? "10" : "850"}
                  className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                />
                <span className="text-sm text-neutral-500">
                  {n.tipo === "porcentaje" ? "%" : "$ c/u"}
                </span>
                {niveles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarNivel(i)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={agregarNivel}
              className="text-sm text-neutral-300 hover:text-white"
            >
              + Agregar nivel
            </button>
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
            {guardando ? "Guardando..." : "Crear regla"}
          </button>
        </form>

        {/* Lista */}
        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            Aún no tienes reglas de mayoreo.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-4"
              >
                <div>
                  <p className="font-semibold">
                    {m.alcance === "COLECCION"
                      ? `Colección: ${nombreColeccion(m.coleccionId)}`
                      : `Marca: ${m.marca}`}
                  </p>
                  <p className="text-sm text-neutral-400">
                    {m.niveles.map(nivelTxt).join("  ·  ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      m.activo
                        ? "bg-green-900/50 text-green-400"
                        : "bg-neutral-800 text-neutral-500"
                    }`}
                  >
                    {m.activo ? "Activa" : "Inactiva"}
                  </span>
                  <button
                    onClick={() => toggle(m)}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-300 hover:border-white"
                  >
                    {m.activo ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    onClick={() => borrar(m)}
                    className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-red-700 hover:text-red-400"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
