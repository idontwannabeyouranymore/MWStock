"use client";

import { useState } from "react";
import { precioMayoreo, type NivelMayoreo } from "@/lib/mayoreo";

type Prod = {
  id: string;
  nombre: string;
  marca: string;
  imagen: string | null;
  precioBase: number;
  niveles: NivelMayoreo[];
};

export default function CarritoMayoreo({
  productos,
  tiendaNombre,
  whatsapp,
  colorTema,
  tarjeta,
  textoTenue,
}: {
  productos: Prod[];
  tiendaNombre: string;
  whatsapp: string | null;
  colorTema: string;
  tarjeta: string;
  textoTenue: string;
}) {
  const [cant, setCant] = useState<Record<string, number>>({});
  const set = (id: string, q: number) =>
    setCant((c) => ({ ...c, [id]: Math.max(0, Math.floor(q) || 0) }));

  const lineas = productos.map((p) => {
    const q = cant[p.id] || 0;
    const unit = precioMayoreo(p.precioBase, p.niveles, q > 0 ? q : 1);
    return { p, q, unit, subtotal: unit * q };
  });
  const total = lineas.reduce((s, l) => s + l.subtotal, 0);
  const piezas = lineas.reduce((s, l) => s + l.q, 0);

  function nivelesTxt(p: Prod) {
    return p.niveles
      .slice()
      .sort((a, b) => a.min - b.min)
      .map((n) =>
        n.tipo === "porcentaje"
          ? `${n.min}+ = −${n.valor}%`
          : `${n.min}+ = $${n.valor} c/u`
      )
      .join("   ·   ");
  }

  function enviar() {
    const items = lineas.filter((l) => l.q > 0);
    if (items.length === 0) {
      alert("Agrega al menos un producto al pedido.");
      return;
    }
    let txt = `*Pedido de mayoreo - ${tiendaNombre}*\n\n`;
    for (const l of items) {
      txt += `- ${l.q}x ${l.p.nombre}: $${l.unit.toFixed(
        2
      )} c/u = $${l.subtotal.toFixed(2)}\n`;
    }
    txt += `\nTotal: $${total.toFixed(2)} (${piezas} piezas)`;
    const tel = (whatsapp || "").replace(/\D/g, "");
    if (!tel) {
      alert(
        "Esta tienda no tiene WhatsApp configurado. Toma una captura de tu pedido."
      );
      return;
    }
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(txt)}`,
      "_blank"
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {productos.map((p) => {
        const q = cant[p.id] || 0;
        const unit = precioMayoreo(p.precioBase, p.niveles, q > 0 ? q : 1);
        const rebajado = unit < p.precioBase;
        return (
          <div
            key={p.id}
            className={`flex flex-wrap items-center gap-4 overflow-hidden p-4 ${tarjeta}`}
          >
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
              {p.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imagen}
                  alt={p.nombre}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>

            <div className="min-w-[160px] flex-1">
              <p className="font-semibold">{p.nombre}</p>
              {p.marca ? (
                <p className={`text-xs ${textoTenue}`}>{p.marca}</p>
              ) : null}
              <p className={`mt-1 text-xs ${textoTenue}`}>{nivelesTxt(p)}</p>
            </div>

            <div className="text-right">
              <div className="flex items-baseline justify-end gap-2">
                {rebajado && (
                  <span className={`text-xs line-through opacity-60 ${textoTenue}`}>
                    ${p.precioBase.toFixed(0)}
                  </span>
                )}
                <span className="font-bold" style={{ color: colorTema }}>
                  ${unit.toFixed(2)}
                </span>
                <span className={`text-xs ${textoTenue}`}>c/u</span>
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => set(p.id, q - 1)}
                  className="h-8 w-8 rounded-lg bg-neutral-800 font-bold text-white"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  value={q === 0 ? "" : q}
                  onChange={(e) => set(p.id, Number(e.target.value))}
                  placeholder="0"
                  className="w-14 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-center text-white outline-none focus:border-white"
                />
                <button
                  onClick={() => set(p.id, q + 1)}
                  className="h-8 w-8 rounded-lg bg-neutral-800 font-bold text-white"
                >
                  +
                </button>
              </div>
              {q > 0 && (
                <p className={`mt-1 text-xs ${textoTenue}`}>
                  Subtotal: ${(unit * q).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Barra fija con el total */}
      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs text-neutral-400">
              {piezas} {piezas === 1 ? "pieza" : "piezas"}
            </p>
            <p className="text-xl font-bold text-white">${total.toFixed(2)}</p>
          </div>
          <button
            onClick={enviar}
            disabled={piezas === 0}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-40"
          >
            Enviar pedido por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
