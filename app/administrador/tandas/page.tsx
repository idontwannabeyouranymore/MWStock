"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type TandaResumen = {
  id: string;
  nombre: string;
  cuota: number;
  frecuencia: string;
  estado: string;
  participantes: number;
  periodosTotal: number;
  periodosEntregados: number;
  recaudado: number;
  esperado: number;
};

type ClienteOpcion = {
  id: string;
  nombre: string;
};

const FRECUENCIAS = [
  { valor: "SEMANAL", etiqueta: "Semanal" },
  { valor: "QUINCENAL", etiqueta: "Quincenal" },
  { valor: "MENSUAL", etiqueta: "Mensual" },
];

const ESTADO_COLOR: Record<string, string> = {
  ACTIVA: "bg-green-900/50 text-green-400",
  FINALIZADA: "bg-neutral-800 text-neutral-400",
  CANCELADA: "bg-red-900/50 text-red-400",
};

export default function TandasPage() {
  const [tandas, setTandas] = useState<TandaResumen[]>([]);
  const [clientes, setClientes] = useState<ClienteOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [nombre, setNombre] = useState("");
  const [cuota, setCuota] = useState("");
  const [frecuencia, setFrecuencia] = useState("SEMANAL");
  const [fechaInicio, setFechaInicio] = useState("");
  const [seleccion, setSeleccion] = useState("");
  const [participantes, setParticipantes] = useState<ClienteOpcion[]>([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [rt, rc] = await Promise.all([
      fetch("/api/tandas"),
      fetch("/api/clientes"),
    ]);
    setTandas(rt.ok ? await rt.json() : []);
    const cli = rc.ok ? await rc.json() : [];
    setClientes(
      Array.isArray(cli)
        ? cli.map((c: ClienteOpcion) => ({ id: c.id, nombre: c.nombre }))
        : []
    );
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function agregarParticipante() {
    if (!seleccion) return;
    if (participantes.some((p) => p.id === seleccion)) return;
    const cliente = clientes.find((c) => c.id === seleccion);
    if (cliente) setParticipantes((prev) => [...prev, cliente]);
    setSeleccion("");
  }

  function quitarParticipante(id: string) {
    setParticipantes((prev) => prev.filter((p) => p.id !== id));
  }

  function mover(indice: number, delta: number) {
    setParticipantes((prev) => {
      const arr = [...prev];
      const nuevo = indice + delta;
      if (nuevo < 0 || nuevo >= arr.length) return prev;
      [arr[indice], arr[nuevo]] = [arr[nuevo], arr[indice]];
      return arr;
    });
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || !cuota || participantes.length < 2) {
      alert("Pon nombre, cuota y al menos 2 participantes");
      return;
    }
    setGuardando(true);
    try {
      const r = await fetch("/api/tandas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          cuota: Number(cuota),
          frecuencia,
          fechaInicio: fechaInicio || undefined,
          participantes: participantes.map((p) => p.id),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setNombre("");
      setCuota("");
      setFrecuencia("SEMANAL");
      setFechaInicio("");
      setParticipantes([]);
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  const disponibles = clientes.filter(
    (c) => !participantes.some((p) => p.id === c.id)
  );

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Administrador
            </p>
            <h1 className="mt-2 text-3xl font-bold">Tandas</h1>
            <p className="mt-2 text-neutral-400">
              Cundinas rotativas: cada turno, todos aportan y uno recibe un
              perfume.
            </p>
          </div>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-neutral-200"
          >
            {mostrarForm ? "Cerrar" : "+ Nueva tanda"}
          </button>
        </div>

        {mostrarForm && (
          <form
            onSubmit={crear}
            className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm text-neutral-300">Nombre</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tanda de septiembre"
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-300">
                  Cuota por persona
                </label>
                <input
                  value={cuota}
                  onChange={(e) => setCuota(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="100"
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-300">Frecuencia</label>
                <select
                  value={frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
                >
                  {FRECUENCIAS.map((f) => (
                    <option key={f.valor} value={f.valor}>
                      {f.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-neutral-300">
                  Fecha de inicio (opcional)
                </label>
                <input
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  type="date"
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-neutral-300">
                Participantes (el orden define el turno)
              </label>
              <div className="mt-1 flex gap-2">
                <select
                  value={seleccion}
                  onChange={(e) => setSeleccion(e.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
                >
                  <option value="">— Elegir cliente —</option>
                  {disponibles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={agregarParticipante}
                  className="flex-shrink-0 rounded-xl bg-neutral-800 px-4 py-3 font-semibold hover:bg-neutral-700"
                >
                  Agregar
                </button>
              </div>
              {clientes.length === 0 && (
                <p className="mt-2 text-xs text-amber-400">
                  No tienes clientes. Crea clientes primero en la sección
                  Clientes.
                </p>
              )}

              {participantes.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {participantes.map((p, i) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-2"
                    >
                      <span>
                        <span className="mr-2 inline-block w-6 text-center font-bold text-neutral-500">
                          {i + 1}
                        </span>
                        {p.nombre}
                      </span>
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => mover(i, -1)}
                          className="rounded-lg bg-neutral-800 px-2 py-1 text-xs"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => mover(i, 1)}
                          className="rounded-lg bg-neutral-800 px-2 py-1 text-xs"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => quitarParticipante(p.id)}
                          className="rounded-lg px-2 py-1 text-xs text-red-400 hover:text-red-300"
                        >
                          Quitar
                        </button>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {guardando ? "Creando..." : "Crear tanda"}
            </button>
          </form>
        )}

        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : tandas.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            No hay tandas todavía.
          </p>
        ) : (
          <div className="space-y-3">
            {tandas.map((t) => (
              <Link
                key={t.id}
                href={`/administrador/tandas/${t.id}`}
                className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{t.nombre}</h3>
                    <p className="text-sm text-neutral-400">
                      {t.participantes} personas · cuota ${t.cuota.toFixed(2)} ·{" "}
                      {t.frecuencia.toLowerCase()}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      ESTADO_COLOR[t.estado] || "bg-neutral-800"
                    }`}
                  >
                    {t.estado}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-400">
                  <span>
                    Entregas: {t.periodosEntregados}/{t.periodosTotal}
                  </span>
                  <span>
                    Recaudado: ${t.recaudado.toFixed(2)} / $
                    {t.esperado.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
