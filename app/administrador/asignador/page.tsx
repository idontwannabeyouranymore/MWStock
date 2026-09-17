"use client";

import { useEffect, useState } from "react";

type Coleccion = { id: string; nombre: string };
type Fila = { talla: string; stock: string; precio: string };

export default function AsignadorPage() {
  const [colecciones, setColecciones] = useState<Coleccion[]>([]);
  const [coleccionId, setColeccionId] = useState("");
  const [modo, setModo] = useState<"agregar" | "actualizar">("agregar");
  const [filas, setFilas] = useState<Fila[]>([{ talla: "", stock: "10", precio: "" }]);

  const [rango, setRango] = useState("");
  const [stockDefault, setStockDefault] = useState("10");
  const [precioDefault, setPrecioDefault] = useState("");

  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<string>("");

  useEffect(() => {
    fetch("/api/colecciones")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const activas = Array.isArray(d)
          ? d.filter((c: { estado: string }) => c.estado !== "ARCHIVADA")
          : [];
        setColecciones(activas);
      })
      .catch(() => {});
  }, []);

  function setFila(i: number, patch: Partial<Fila>) {
    setFilas((fs) => fs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function agregarFila() {
    setFilas((fs) => [...fs, { talla: "", stock: stockDefault, precio: "" }]);
  }
  function quitarFila(i: number) {
    setFilas((fs) => (fs.length === 1 ? fs : fs.filter((_, idx) => idx !== i)));
  }

  function generarDesdeRango() {
    const partes = rango
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (partes.length === 0) return;
    setFilas(
      partes.map((t) => ({
        talla: t,
        stock: stockDefault || "0",
        precio: precioDefault || "",
      }))
    );
  }

  async function aplicar() {
    setError("");
    setResultado("");
    if (!coleccionId) {
      setError("Elige una colección.");
      return;
    }
    const tallas = filas
      .filter((f) => f.talla.trim())
      .map((f) => ({
        talla: f.talla.trim(),
        stock: Number(f.stock) || 0,
        precio: f.precio === "" ? null : Number(f.precio),
      }));
    if (tallas.length === 0) {
      setError("Agrega al menos una talla.");
      return;
    }
    const col = colecciones.find((c) => c.id === coleccionId);
    if (
      !confirm(
        `Se aplicarán ${tallas.length} talla(s) a TODOS los productos de la colección "${col?.nombre}". ¿Continuar?`
      )
    ) {
      return;
    }
    setAplicando(true);
    try {
      const r = await fetch("/api/asignador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coleccionId, modo, tallas }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo aplicar");
      setResultado(
        `Listo. Productos afectados: ${d.productos}. Presentaciones creadas: ${d.creadas}. Actualizadas: ${d.actualizadas}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setAplicando(false);
    }
  }

  const inp =
    "w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white";

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador · Herramienta
          </p>
          <h1 className="mt-2 text-3xl font-bold">Asignador de tallas</h1>
          <p className="mt-2 text-neutral-400">
            Aplica un conjunto de presentaciones (tallas) a todos los productos
            de una colección de una sola vez.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-800 bg-amber-950/20 p-4 text-sm text-amber-200">
          ⚠️ Esto modifica <b>todos los productos</b> de la colección elegida.
          Revísalo bien antes de aplicar.
        </div>

        <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
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
            <label className="text-sm">
              <span className="text-neutral-400">Modo</span>
              <select
                value={modo}
                onChange={(e) =>
                  setModo(e.target.value as "agregar" | "actualizar")
                }
                className={inp + " mt-1"}
              >
                <option value="agregar">Solo agregar las que falten</option>
                <option value="actualizar">
                  Agregar y actualizar stock/precio de las que ya existen
                </option>
              </select>
            </label>
          </div>

          {/* Generador rápido */}
          <div className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm font-semibold text-neutral-300">
              Generar rápido
            </p>
            <input
              value={rango}
              onChange={(e) => setRango(e.target.value)}
              placeholder="Tallas separadas por coma (ej. 25, 26, 27, 28, 29)"
              className={inp}
            />
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span className="text-neutral-400">Stock por talla</span>
                <input
                  type="number"
                  value={stockDefault}
                  onChange={(e) => setStockDefault(e.target.value)}
                  className="mt-1 w-28 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                />
              </label>
              <label className="text-sm">
                <span className="text-neutral-400">Precio (opcional)</span>
                <input
                  type="number"
                  value={precioDefault}
                  onChange={(e) => setPrecioDefault(e.target.value)}
                  placeholder="usa el del producto"
                  className="mt-1 w-40 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                />
              </label>
              <button
                type="button"
                onClick={generarDesdeRango}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200"
              >
                Generar filas
              </button>
            </div>
          </div>

          {/* Editor de filas */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-neutral-300">
              Presentaciones a asignar
            </p>
            {filas.map((f, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  value={f.talla}
                  onChange={(e) => setFila(i, { talla: e.target.value })}
                  placeholder="Talla (ej. 26 MX)"
                  className="w-40 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                />
                <input
                  type="number"
                  value={f.stock}
                  onChange={(e) => setFila(i, { stock: e.target.value })}
                  placeholder="stock"
                  className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                />
                <input
                  type="number"
                  value={f.precio}
                  onChange={(e) => setFila(i, { precio: e.target.value })}
                  placeholder="precio (opc.)"
                  className="w-32 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-white outline-none focus:border-white"
                />
                {filas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarFila(i)}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={agregarFila}
              className="text-sm text-neutral-300 hover:text-white"
            >
              + Agregar talla
            </button>
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          {resultado && (
            <p className="rounded-lg bg-green-950/40 px-3 py-2 text-sm text-green-400">
              {resultado}
            </p>
          )}

          <button
            onClick={aplicar}
            disabled={aplicando}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {aplicando ? "Aplicando..." : "Aplicar a la colección"}
          </button>
        </div>
      </section>
    </main>
  );
}
