"use client";

import { useEffect, useState } from "react";

type Producto = {
  id: string;
  nombre: string;
  marca: string | null;
  esSet?: boolean;
  estado: string;
};

type Foto = { file: File; url: string; productoId: string };

export default function FotosMasivasPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/productos")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Producto[]) => {
        if (Array.isArray(data)) {
          setProductos(data.filter((p) => !p.esSet && p.estado !== "ARCHIVADO"));
        }
      })
      .catch(() => {});
  }, []);

  function etiqueta(p: Producto) {
    return `${p.marca ? p.marca + " · " : ""}${p.nombre}`;
  }

  async function alElegirFotos(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResultado(null);
    const files = Array.from(e.target.files ?? []).slice(0, 12);
    if (files.length === 0) return;

    setFotos(
      files.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        productoId: "",
      }))
    );
    e.target.value = "";

    setProcesando(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("fotos", f));
      const r = await fetch("/api/ia/emparejar-fotos", {
        method: "POST",
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "No se pudieron emparejar");
      const matches: { imagen: number; productoId: string | null }[] =
        data.matches || [];
      setFotos((prev) =>
        prev.map((f, i) => {
          const m = matches.find((x) => x.imagen === i + 1);
          return { ...f, productoId: m?.productoId || "" };
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setProcesando(false);
    }
  }

  function cambiarProducto(indice: number, productoId: string) {
    setFotos((prev) =>
      prev.map((f, i) => (i === indice ? { ...f, productoId } : f))
    );
  }

  function quitar(indice: number) {
    setFotos((prev) => prev.filter((_, i) => i !== indice));
  }

  async function guardar() {
    const aGuardar = fotos.filter((f) => f.productoId);
    if (aGuardar.length === 0) {
      setError("Asigna al menos una foto a un producto.");
      return;
    }
    setGuardando(true);
    setError("");
    let ok = 0;
    try {
      for (const f of aGuardar) {
        const fd = new FormData();
        fd.append("file", f.file);
        fd.append("productoId", f.productoId);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        if (!up.ok) continue;
        const { url } = await up.json();
        const at = await fetch(`/api/productos/${f.productoId}/imagenes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        if (at.ok) ok += 1;
      }
      setResultado(`${ok} foto(s) guardadas y asignadas a sus productos.`);
      setFotos([]);
    } catch {
      setError("Hubo un error al guardar algunas fotos.");
    } finally {
      setGuardando(false);
    }
  }

  const asignadas = fotos.filter((f) => f.productoId).length;

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Fotos masivas (IA)</h1>
          <p className="mt-2 text-neutral-400">
            Sube varias fotos de golpe y la IA las asigna al producto correcto.
            <strong> Revisa y corrige</strong> antes de guardar — la IA puede
            equivocarse.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-5">
          <label className="text-sm text-neutral-300">
            Elige hasta 12 fotos
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={alElegirFotos}
            disabled={procesando || guardando}
            className="mt-2 block w-full text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-emerald-400 disabled:opacity-50"
          />
          {procesando && (
            <p className="mt-3 text-sm text-emerald-300">
              Emparejando con IA… tarda unos segundos.
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {resultado && (
          <p className="rounded-lg bg-green-950/30 px-3 py-2 text-sm text-green-400">
            ✓ {resultado}
          </p>
        )}

        {fotos.length > 0 && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {fotos.map((f, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-3"
                >
                  <img
                    src={f.url}
                    alt={`foto ${i + 1}`}
                    className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col gap-2">
                    <select
                      value={f.productoId}
                      onChange={(e) => cambiarProducto(i, e.target.value)}
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm outline-none focus:border-white"
                    >
                      <option value="">— Sin asignar (saltar) —</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {etiqueta(p)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => quitar(i)}
                      className="self-start text-xs text-red-400 hover:text-red-300"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={guardar}
              disabled={guardando || asignadas === 0}
              className="w-full rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {guardando
                ? "Guardando..."
                : `Guardar ${asignadas} foto(s) asignada(s)`}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
