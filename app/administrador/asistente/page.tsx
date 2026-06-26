"use client";

import { useState } from "react";

type Mensaje = { rol: "user" | "ia"; texto: string };

const SUGERENCIAS = [
  "¿Cuánto vendí esta semana?",
  "¿Qué se me está agotando?",
  "¿Cuál es mi producto más vendido del mes?",
  "¿Cuánto vale mi inventario?",
  "¿Cómo van mis ventas de hoy?",
];

export default function AsistentePage() {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar(pregunta: string) {
    const texto = pregunta.trim();
    if (!texto || cargando) return;
    setInput("");
    setMensajes((prev) => [...prev, { rol: "user", texto }]);
    setCargando(true);
    try {
      const r = await fetch("/api/ia/analista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pregunta: texto }),
      });
      const data = await r.json();
      const respuesta = r.ok
        ? data.respuesta
        : data.error || "No se pudo consultar.";
      setMensajes((prev) => [...prev, { rol: "ia", texto: respuesta }]);
    } catch {
      setMensajes((prev) => [
        ...prev,
        { rol: "ia", texto: "Hubo un error de conexión. Intenta de nuevo." },
      ]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Asistente IA</h1>
          <p className="mt-2 text-neutral-400">
            Pregunta sobre tus ventas e inventario. Responde con datos reales de
            tu tienda.
          </p>
        </div>

        {mensajes.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                onClick={() => enviar(s)}
                className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition hover:border-white hover:text-white"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {mensajes.map((m, i) => (
            <div
              key={i}
              className={m.rol === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                  m.rol === "user"
                    ? "bg-white text-black"
                    : "border border-neutral-800 bg-neutral-900 text-neutral-100"
                }`}
              >
                {m.texto}
              </div>
            </div>
          ))}
          {cargando && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
                Pensando…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(input);
          }}
          className="sticky bottom-4 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta…"
            className="w-full rounded-2xl border border-neutral-700 bg-neutral-900 px-5 py-4 text-white outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={cargando || input.trim().length === 0}
            className="flex-shrink-0 rounded-2xl bg-green-600 px-5 py-4 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            Enviar
          </button>
        </form>
      </section>
    </main>
  );
}
