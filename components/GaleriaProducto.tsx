"use client";

import { useState } from "react";

type Props = {
  imagenes: { url: string }[];
  nombre: string;
  soldOut: boolean;
  destacado: boolean;
  nuevo: boolean;
  emojis: boolean;
  colorTema: string;
};

export default function GaleriaProducto({
  imagenes,
  nombre,
  soldOut,
  destacado,
  nuevo,
  emojis,
  colorTema,
}: Props) {
  const [activa, setActiva] = useState(0);

  const principal = imagenes[activa];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
        <div className="relative overflow-hidden bg-neutral-800">
          {principal ? (
            <img
              src={principal.url}
              alt={nombre}
              className="block h-auto w-full"
            />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center">
              <span className="text-neutral-500">Sin imagen</span>
            </div>
          )}

          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {destacado && (
              <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black shadow">
                {emojis ? "⭐ " : ""}Destacado
              </span>
            )}
            {nuevo && (
              <span
                className="rounded-full px-3 py-1 text-xs font-bold text-black shadow"
                style={{ backgroundColor: colorTema }}
              >
                {emojis ? "🔥 " : ""}Nuevo
              </span>
            )}
          </div>

          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <span className="rounded-full border border-white px-6 py-3 text-xl font-bold">
                SOLD OUT
              </span>
            </div>
          )}
        </div>
      </div>

      {imagenes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {imagenes.map((imagen, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiva(i)}
              aria-label={`Ver foto ${i + 1}`}
              className="h-16 w-16 overflow-hidden rounded-xl border-2 transition"
              style={{
                borderColor: i === activa ? colorTema : "transparent",
                opacity: i === activa ? 1 : 0.6,
              }}
            >
              <img
                src={imagen.url}
                alt={`${nombre} ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
