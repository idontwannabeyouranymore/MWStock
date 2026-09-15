"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  actualizarCantidad,
  leerCarrito,
  limpiarCarrito,
  onCarritoCambio,
  piezasDeProducto,
  precioUnitarioLinea,
  totalCarrito,
  type ItemCarrito,
} from "@/lib/carrito-mayoreo";

export default function CarritoMayoreoContenido({
  slug,
  tiendaNombre,
  whatsapp,
  colorTema,
  hrefSeguir,
}: {
  slug: string;
  tiendaNombre: string;
  whatsapp: string | null;
  colorTema: string;
  hrefSeguir: string;
}) {
  const [items, setItems] = useState<ItemCarrito[]>([]);

  useEffect(() => {
    const refrescar = () => setItems(leerCarrito(slug));
    refrescar();
    return onCarritoCambio(refrescar);
  }, [slug]);

  function cambiar(varianteId: string, cantidad: number) {
    actualizarCantidad(slug, varianteId, cantidad);
    setItems(leerCarrito(slug));
  }

  // Agrupa por producto.
  const grupos = new Map<
    string,
    { nombre: string; imagen: string | null; lineas: ItemCarrito[] }
  >();
  for (const it of items) {
    const g = grupos.get(it.productoId) || {
      nombre: it.nombre,
      imagen: it.imagen,
      lineas: [],
    };
    g.lineas.push(it);
    grupos.set(it.productoId, g);
  }
  const listaGrupos = [...grupos.entries()];
  const { piezas, dinero } = totalCarrito(items);

  function enviar() {
    if (items.length === 0) return;
    let txt = `*Pedido de mayoreo - ${tiendaNombre}*\n`;
    for (const [pid, g] of listaGrupos) {
      const totalProd = piezasDeProducto(items, pid);
      const unit = precioUnitarioLinea(items, g.lineas[0]);
      txt += `\n*${g.nombre}*\n`;
      for (const l of g.lineas) {
        txt += `  - ${l.talla}: ${l.cantidad} pza(s)\n`;
      }
      txt += `  ${totalProd} pzas a $${unit.toFixed(2)} c/u = $${(
        unit * totalProd
      ).toFixed(2)}\n`;
    }
    txt += `\n*Total: $${dinero.toFixed(2)} (${piezas} piezas)*`;
    const tel = (whatsapp || "").replace(/\D/g, "");
    if (!tel) {
      alert("Esta tienda no tiene WhatsApp. Toma una captura de tu pedido.");
      return;
    }
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`, "_blank");
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center">
        <p className="text-neutral-400">Tu carrito de mayoreo está vacío.</p>
        <Link
          href={hrefSeguir}
          className="mt-4 inline-flex rounded-xl px-5 py-3 font-semibold text-black"
          style={{ backgroundColor: colorTema }}
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {listaGrupos.map(([pid, g]) => {
        const totalProd = piezasDeProducto(items, pid);
        const unit = precioUnitarioLinea(items, g.lineas[0]);
        return (
          <div
            key={pid}
            className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-800">
                {g.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.imagen}
                    alt={g.nombre}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{g.nombre}</p>
                <p className="text-xs text-neutral-500">
                  {totalProd} pzas · ${unit.toFixed(2)} c/u
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {g.lineas.map((l) => (
                <div
                  key={l.varianteId}
                  className="flex items-center justify-between gap-2 rounded-xl bg-neutral-950 px-3 py-2"
                >
                  <span className="text-sm">{l.talla}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => cambiar(l.varianteId, l.cantidad - 1)}
                      className="h-8 w-8 rounded-lg bg-neutral-800 font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center">{l.cantidad}</span>
                    <button
                      onClick={() => cambiar(l.varianteId, l.cantidad + 1)}
                      className="h-8 w-8 rounded-lg bg-neutral-800 font-bold"
                    >
                      +
                    </button>
                    <span className="w-20 text-right text-sm font-semibold">
                      ${(unit * l.cantidad).toFixed(2)}
                    </span>
                    <button
                      onClick={() => cambiar(l.varianteId, 0)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <button
        onClick={() => {
          if (confirm("¿Vaciar el carrito?")) limpiarCarrito(slug);
        }}
        className="text-sm text-neutral-400 hover:text-red-400"
      >
        Vaciar carrito
      </button>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs text-neutral-400">
              {piezas} {piezas === 1 ? "pieza" : "piezas"}
            </p>
            <p className="text-xl font-bold text-white">${dinero.toFixed(2)}</p>
          </div>
          <button
            onClick={enviar}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            Enviar pedido por WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
