"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { enlaceCatalogo } from "@/lib/dominios";

type ProductoBusqueda = {
  id: string;
  nombre: string;
  imagen: string | null;
  soldOut: boolean;
  precioMin: number;
  precioMax: number;
  precioOriginalMin: number;
  descuento: number;
  marca: string;
  coleccionIds: string[];
};

type Categoria = {
  id: string;
  nombre: string;
};

type Props = {
  productos: ProductoBusqueda[];
  categorias: Categoria[];
  slug: string;
  colorTema: string;
  emojis: boolean;
  iaActivo?: boolean;
  mostrarPrecios?: boolean;
  gridClass?: string;
  tarjeta?: string;
  cardHover?: string;
  imagenHover?: string;
  textoTenue?: string;
};

export default function BuscadorCatalogo({
  productos,
  categorias,
  slug,
  colorTema,
  emojis,
  iaActivo = false,
  mostrarPrecios = true,
  gridClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  tarjeta = "rounded-2xl border border-neutral-800 bg-neutral-900",
  cardHover = "transition hover:-translate-y-1 hover:border-neutral-600",
  imagenHover = "transition duration-500 group-hover:scale-105",
  textoTenue = "text-neutral-400",
}: Props) {
  const [q, setQ] = useState("");
  const [catsSel, setCatsSel] = useState<string[]>([]);
  const [marcaSel, setMarcaSel] = useState("");
  const [precioMin, setPrecioMin] = useState<number | null>(null);
  const [precioMax, setPrecioMax] = useState<number | null>(null);
  const [iaCargando, setIaCargando] = useState(false);
  const [iaResumen, setIaResumen] = useState("");

  const textoActivo = q.trim().length >= 2;
  const hayFiltro =
    textoActivo ||
    catsSel.length > 0 ||
    marcaSel !== "" ||
    precioMin !== null ||
    precioMax !== null;

  const filtrados = useMemo(() => {
    if (!hayFiltro) return [];
    const t = q.trim().toLowerCase();
    const m = marcaSel.trim().toLowerCase();
    return productos
      .filter((p) => {
        const coincideTexto =
          t.length < 2 ||
          p.nombre.toLowerCase().includes(t) ||
          p.marca.toLowerCase().includes(t);
        const coincideCat =
          catsSel.length === 0 ||
          p.coleccionIds.some((id) => catsSel.includes(id));
        const coincideMarca = !m || p.marca.toLowerCase().includes(m);
        const coincidePrecio =
          (precioMin === null || p.precioMax >= precioMin) &&
          (precioMax === null || p.precioMin <= precioMax);
        return coincideTexto && coincideCat && coincideMarca && coincidePrecio;
      })
      .slice(0, 60);
  }, [q, catsSel, marcaSel, precioMin, precioMax, productos, hayFiltro]);

  function toggleCat(id: string) {
    setCatsSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function limpiarTodo() {
    setQ("");
    setCatsSel([]);
    setMarcaSel("");
    setPrecioMin(null);
    setPrecioMax(null);
    setIaResumen("");
  }

  async function buscarConIA() {
    const query = q.trim();
    if (query.length < 2 || iaCargando) return;
    setIaCargando(true);
    try {
      const r = await fetch("/api/buscar-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, query }),
      });
      if (!r.ok) return; // respaldo: se queda la búsqueda normal por texto
      const data = await r.json();
      const f = data.filtro as {
        texto: string;
        categoria: string;
        marca: string;
        precioMin: number | null;
        precioMax: number | null;
      };
      setQ(f.texto || "");
      const cat = categorias.find(
        (c) => c.nombre.toLowerCase() === (f.categoria || "").toLowerCase()
      );
      setCatsSel(cat ? [cat.id] : []);
      setMarcaSel(f.marca || "");
      setPrecioMin(f.precioMin);
      setPrecioMax(f.precioMax);

      const partes: string[] = [];
      if (f.categoria) partes.push(f.categoria);
      if (f.marca) partes.push(`marca ${f.marca}`);
      if (f.texto) partes.push(`"${f.texto}"`);
      if (f.precioMin && f.precioMax)
        partes.push(`$${f.precioMin}–$${f.precioMax}`);
      else if (f.precioMax) partes.push(`hasta $${f.precioMax}`);
      else if (f.precioMin) partes.push(`desde $${f.precioMin}`);
      setIaResumen(partes.join(" · "));
    } catch {
      // respaldo silencioso: la búsqueda normal sigue funcionando
    } finally {
      setIaCargando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIaResumen("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && iaActivo) {
              e.preventDefault();
              buscarConIA();
            }
          }}
          placeholder={emojis ? "🔍  Buscar..." : "Buscar..."}
          className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-4 text-white outline-none focus:border-white"
        />
        {iaActivo && (
          <button
            type="button"
            onClick={buscarConIA}
            disabled={iaCargando || q.trim().length < 2}
            className="flex-shrink-0 rounded-2xl px-5 py-4 font-semibold text-black transition hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: colorTema }}
          >
            {iaCargando ? "Buscando…" : `${emojis ? "✨ " : ""}Buscar con IA`}
          </button>
        )}
      </div>

      {iaActivo && (
        <p className="text-xs text-neutral-500">
          Tip: escribe como hablas, ej. &quot;gorra negra de menos de $1500&quot;
          y toca &quot;Buscar con IA&quot;.
        </p>
      )}

      {iaResumen && (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-800 px-3 py-1 text-sm text-neutral-200">
            {emojis ? "✨ " : ""}
            {iaResumen}
          </span>
          <button
            type="button"
            onClick={limpiarTodo}
            className="text-sm text-neutral-400 hover:text-white"
          >
            ✕ limpiar
          </button>
        </div>
      )}

      {categorias.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(catsSel.length > 0 || marcaSel || precioMin || precioMax) && (
            <button
              type="button"
              onClick={limpiarTodo}
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:border-white hover:text-white"
            >
              Limpiar
            </button>
          )}
          {categorias.map((cat) => {
            const activa = catsSel.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCat(cat.id)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activa
                    ? "border-transparent text-black"
                    : "border-neutral-700 text-neutral-300 hover:border-white hover:text-white"
                }`}
                style={activa ? { backgroundColor: colorTema } : undefined}
              >
                {cat.nombre}
              </button>
            );
          })}
        </div>
      )}

      {hayFiltro && (
        <div>
          {filtrados.length === 0 ? (
            <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
              Sin resultados{textoActivo ? ` para "${q.trim()}"` : ""}.
            </p>
          ) : (
            <>
              <p className="text-sm text-neutral-500">
                {filtrados.length}{" "}
                {filtrados.length === 1 ? "resultado" : "resultados"}
              </p>
              <div className={`mt-4 grid gap-5 ${gridClass}`}>
                {filtrados.map((p) => (
                  <Link
                    key={p.id}
                    href={enlaceCatalogo(slug, `/producto/${p.id}`)}
                    className={`group block overflow-hidden ${tarjeta} ${cardHover}`}
                  >
                    <div className="relative flex h-48 items-center justify-center overflow-hidden bg-neutral-800">
                      {p.imagen ? (
                        <img
                          src={p.imagen}
                          alt={p.nombre}
                          className={`h-full w-full object-cover ${imagenHover}`}
                        />
                      ) : (
                        <span className="text-neutral-500">Sin imagen</span>
                      )}
                      {p.soldOut && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                          <span className="rounded-full border border-white px-4 py-1 text-sm font-bold">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 p-4">
                      <h3 className="font-semibold">{p.nombre}</h3>
                      {mostrarPrecios && (
                        <p className="flex flex-wrap items-center gap-2 font-bold">
                          {p.descuento > 0 && (
                            <span
                              className={`text-sm font-semibold line-through opacity-60 ${textoTenue}`}
                            >
                              ${p.precioOriginalMin.toFixed(2)}
                            </span>
                          )}
                          <span style={{ color: colorTema }}>
                            {p.precioMin === p.precioMax
                              ? `$${p.precioMin.toFixed(2)}`
                              : `desde $${p.precioMin.toFixed(2)}`}
                          </span>
                          {p.descuento > 0 && (
                            <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                              -{p.descuento}%
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
