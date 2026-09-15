"use client";

import { useState } from "react";
import { agregarItem } from "@/lib/carrito-mayoreo";
import { precioMayoreo, type NivelMayoreo } from "@/lib/mayoreo";

type VariantePub = {
  id: string;
  talla: string;
  stock: number;
  precio: number; // ya resuelto (variante.precio ?? producto.precio)
};

export default function AgregarMayoreo({
  slug,
  productoId,
  nombre,
  imagen,
  variantes,
  niveles,
  colorTema,
}: {
  slug: string;
  productoId: string;
  nombre: string;
  imagen: string | null;
  variantes: VariantePub[];
  niveles: NivelMayoreo[];
  colorTema: string;
}) {
  const disponibles = variantes.filter((v) => v.stock > 0);
  const [varianteId, setVarianteId] = useState(disponibles[0]?.id || "");
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const variante = variantes.find((v) => v.id === varianteId);
  const unit = variante
    ? precioMayoreo(variante.precio, niveles, cantidad)
    : 0;
  const rebajado = variante ? unit < variante.precio : false;

  const nivelesTxt = niveles
    .slice()
    .sort((a, b) => a.min - b.min)
    .map((n) =>
      n.tipo === "porcentaje"
        ? `${n.min}+ = −${n.valor}%`
        : `${n.min}+ = $${n.valor} c/u`
    )
    .join("   ·   ");

  function agregar() {
    if (!variante) return;
    const c = Math.max(1, Math.floor(cantidad) || 1);
    agregarItem(slug, {
      productoId,
      nombre,
      imagen,
      varianteId: variante.id,
      talla: variante.talla,
      cantidad: c,
      precioBase: variante.precio,
      niveles,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  }

  if (disponibles.length === 0) {
    return (
      <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
        Agotado por ahora.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <div>
        <p className="text-sm text-neutral-400">Precio de mayoreo</p>
        <p className="text-xs text-neutral-500">{nivelesTxt}</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Talla / presentación</label>
        <div className="flex flex-wrap gap-2">
          {variantes.map((v) => {
            const agotada = v.stock <= 0;
            const sel = v.id === varianteId;
            return (
              <button
                key={v.id}
                disabled={agotada}
                onClick={() => setVarianteId(v.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  agotada
                    ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
                    : sel
                    ? "text-black"
                    : "bg-neutral-800 text-neutral-200"
                }`}
                style={sel && !agotada ? { backgroundColor: colorTema } : {}}
              >
                {v.talla}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            className="h-10 w-10 rounded-lg bg-neutral-800 font-bold text-white"
          >
            −
          </button>
          <input
            type="number"
            min="1"
            value={cantidad}
            onChange={(e) =>
              setCantidad(Math.max(1, Math.floor(Number(e.target.value)) || 1))
            }
            className="w-16 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-2 text-center text-white outline-none focus:border-white"
          />
          <button
            onClick={() => setCantidad((c) => c + 1)}
            className="h-10 w-10 rounded-lg bg-neutral-800 font-bold text-white"
          >
            +
          </button>
        </div>
        <div className="text-right">
          {rebajado && variante && (
            <span className="mr-2 text-sm text-neutral-500 line-through opacity-60">
              ${variante.precio.toFixed(0)}
            </span>
          )}
          <span className="text-xl font-bold" style={{ color: colorTema }}>
            ${unit.toFixed(2)}
          </span>
          <span className="text-xs text-neutral-500"> c/u</span>
        </div>
      </div>

      <button
        onClick={agregar}
        className="w-full rounded-xl px-5 py-4 text-lg font-bold text-black transition hover:opacity-90"
        style={{ backgroundColor: colorTema }}
      >
        {agregado ? "✓ Agregado" : "Agregar al carrito"}
      </button>
      <p className="text-center text-xs text-neutral-500">
        El precio final se calcula por el total de piezas de este producto en tu
        carrito.
      </p>
    </div>
  );
}
