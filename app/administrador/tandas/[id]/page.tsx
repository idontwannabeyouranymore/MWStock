"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type VariantePick = {
  id: string;
  talla: string;
  stock: number;
  estado: string;
};
type ProductoPick = {
  id: string;
  nombre: string;
  estado: string;
  esSet?: boolean;
  variantes: VariantePick[];
};

type Pago = {
  id: string;
  pagado: boolean;
  participanteId: string;
  participante: { cliente: { nombre: string } };
};
type Periodo = {
  id: string;
  numero: number;
  fecha: string;
  entregado: boolean;
  producto: { id: string; nombre: string } | null;
  variante: { id: string; talla: string } | null;
  pagos: Pago[];
};
type Participante = {
  id: string;
  turno: number;
  cliente: { id: string; nombre: string; telefono: string | null };
};
type Tanda = {
  id: string;
  nombre: string;
  cuota: string;
  frecuencia: string;
  estado: string;
  fechaInicio: string;
  participantes: Participante[];
  periodos: Periodo[];
};

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TandaDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [tanda, setTanda] = useState<Tanda | null>(null);
  const [productos, setProductos] = useState<ProductoPick[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pick, setPick] = useState<
    Record<string, { productoId: string; varianteId: string }>
  >({});
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const [rt, rp] = await Promise.all([
      fetch(`/api/tandas/${id}`),
      fetch("/api/productos"),
    ]);
    setTanda(rt.ok ? await rt.json() : null);
    const prods = rp.ok ? await rp.json() : [];
    setProductos(
      Array.isArray(prods)
        ? prods.filter(
            (p: ProductoPick) => !p.esSet && p.estado !== "ARCHIVADO"
          )
        : []
    );
    setCargando(false);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cuota = tanda ? Number(tanda.cuota) : 0;

  // Mapa turno -> nombre de quien recibe.
  const recibePorTurno = useMemo(() => {
    const m = new Map<number, string>();
    tanda?.participantes.forEach((p) => m.set(p.turno, p.cliente.nombre));
    return m;
  }, [tanda]);

  async function togglePago(periodoId: string, participanteId: string, val: boolean) {
    setProcesando(true);
    try {
      const r = await fetch(`/api/tandas/${id}/pago`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodoId, participanteId, pagado: val }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.error || "Error");
      }
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setProcesando(false);
    }
  }

  async function entregar(periodo: Periodo) {
    const sel = pick[periodo.id];
    const varianteId = sel?.varianteId || periodo.variante?.id || "";
    const productoId = sel?.productoId || periodo.producto?.id || "";
    if (!varianteId) {
      alert("Elige el perfume y la presentación antes de entregar");
      return;
    }
    setProcesando(true);
    try {
      const r = await fetch(`/api/tandas/${id}/periodo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodoId: periodo.id,
          productoId,
          varianteId,
          entregado: true,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setProcesando(false);
    }
  }

  async function deshacerEntrega(periodo: Periodo) {
    setProcesando(true);
    try {
      const r = await fetch(`/api/tandas/${id}/periodo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodoId: periodo.id, entregado: false }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Error");
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarEstado(estado: string) {
    await fetch(`/api/tandas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    await cargar();
  }

  async function borrar() {
    if (!confirm("¿Borrar esta tanda? Se elimina todo su historial.")) return;
    const r = await fetch(`/api/tandas/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/administrador/tandas");
    else alert("No se pudo borrar");
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        <p className="text-neutral-400">Cargando...</p>
      </main>
    );
  }
  if (!tanda) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        <p className="text-neutral-400">Tanda no encontrada.</p>
        <Link
          href="/administrador/tandas"
          className="mt-4 inline-block text-sm underline"
        >
          ← Volver
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/administrador/tandas"
          className="text-sm text-neutral-400 hover:text-white"
        >
          ← Tandas
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{tanda.nombre}</h1>
            <p className="mt-1 text-neutral-400">
              {tanda.participantes.length} personas · cuota $
              {cuota.toFixed(2)} · {tanda.frecuencia.toLowerCase()} · inicio{" "}
              {fechaCorta(tanda.fechaInicio)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tanda.estado === "ACTIVA" ? (
              <button
                onClick={() => cambiarEstado("FINALIZADA")}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:border-white"
              >
                Finalizar
              </button>
            ) : (
              <button
                onClick={() => cambiarEstado("ACTIVA")}
                className="rounded-lg border border-neutral-700 px-3 py-2 text-sm hover:border-white"
              >
                Reactivar
              </button>
            )}
            <button
              onClick={borrar}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-red-400 hover:border-red-700"
            >
              Borrar
            </button>
          </div>
        </div>

        {/* Turnos */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="font-semibold">Orden de turnos</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tanda.participantes.map((p) => (
              <span
                key={p.id}
                className="rounded-full border border-neutral-700 px-3 py-1 text-sm"
              >
                <span className="font-bold text-neutral-500">{p.turno}.</span>{" "}
                {p.cliente.nombre}
              </span>
            ))}
          </div>
        </div>

        {/* Periodos */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Periodos</h2>
          {tanda.periodos.map((periodo) => {
            const pagados = periodo.pagos.filter((p) => p.pagado).length;
            const recaudado = pagados * cuota;
            const esperado = periodo.pagos.length * cuota;
            const recibe = recibePorTurno.get(periodo.numero) || "—";
            const sel = pick[periodo.id] || {
              productoId: periodo.producto?.id || "",
              varianteId: periodo.variante?.id || "",
            };
            const prodSel = productos.find((p) => p.id === sel.productoId);

            return (
              <div
                key={periodo.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      Periodo {periodo.numero}{" "}
                      <span className="font-normal text-neutral-500">
                        · {fechaCorta(periodo.fecha)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm">
                      Recibe:{" "}
                      <span className="font-semibold text-amber-400">
                        {recibe}
                      </span>
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-neutral-400">
                      Recaudado: ${recaudado.toFixed(2)} / ${esperado.toFixed(2)}
                    </p>
                    <p className="text-neutral-500">
                      {pagados}/{periodo.pagos.length} pagaron
                    </p>
                  </div>
                </div>

                {/* Recompensa */}
                <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                  {periodo.entregado ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm">
                        <span className="text-green-400">✓ Entregado:</span>{" "}
                        {periodo.producto?.nombre}
                        {periodo.variante ? ` (${periodo.variante.talla})` : ""}
                      </p>
                      <button
                        onClick={() => deshacerEntrega(periodo)}
                        disabled={procesando}
                        className="rounded-lg border border-neutral-700 px-3 py-1 text-xs hover:border-white disabled:opacity-50"
                      >
                        Deshacer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-neutral-400">
                        Perfume de recompensa
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select
                          value={sel.productoId}
                          onChange={(e) =>
                            setPick((prev) => ({
                              ...prev,
                              [periodo.id]: {
                                productoId: e.target.value,
                                varianteId: "",
                              },
                            }))
                          }
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-white"
                        >
                          <option value="">— Perfume —</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                        <select
                          value={sel.varianteId}
                          onChange={(e) =>
                            setPick((prev) => ({
                              ...prev,
                              [periodo.id]: {
                                productoId: sel.productoId,
                                varianteId: e.target.value,
                              },
                            }))
                          }
                          disabled={!prodSel}
                          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-white disabled:opacity-50"
                        >
                          <option value="">— Presentación —</option>
                          {prodSel?.variantes
                            .filter((v) => v.estado !== "ARCHIVADA")
                            .map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.talla} ({v.stock} en stock)
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        onClick={() => entregar(periodo)}
                        disabled={procesando}
                        className="w-full rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-black hover:bg-amber-400 disabled:opacity-50"
                      >
                        Entregar perfume (descuenta stock)
                      </button>
                    </div>
                  )}
                </div>

                {/* Pagos */}
                <div className="mt-4 space-y-1">
                  <p className="text-sm text-neutral-400">Aportaciones</p>
                  {periodo.pagos.map((pago) => (
                    <label
                      key={pago.id}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-neutral-800"
                    >
                      <span className="text-sm">
                        {pago.participante.cliente.nombre}
                      </span>
                      <input
                        type="checkbox"
                        checked={pago.pagado}
                        disabled={procesando}
                        onChange={(e) =>
                          togglePago(
                            periodo.id,
                            pago.participanteId,
                            e.target.checked
                          )
                        }
                        className="h-5 w-5 accent-green-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
