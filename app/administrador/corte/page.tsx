"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizarModulos } from "@/lib/modulos";

type VentaItem = {
  productoNombre: string;
  talla: string;
  cantidad: number;
  subtotal: string;
};
type Venta = {
  id: string;
  total: string;
  metodoPago: string;
  montoRecibido: string | null;
  cambio: string | null;
  clienteNombre: string | null;
  createdAt: string;
  items: VentaItem[];
};
type Abono = {
  id: string;
  monto: string;
  nota: string | null;
  createdAt: string;
  clienteNombre: string;
};
type CajaEstado = {
  fondoCaja: number;
  umbralCajaPeligro: number | null;
  efectivoVentasHoy: number;
  abonosHoy: number;
  retirosHoy: number;
  efectivoEnCaja: number;
  peligro: boolean;
  retiros: {
    id: string;
    monto: number;
    nota: string | null;
    createdAt: string;
  }[];
};

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function hora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const METODO_LABEL: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  FIADO: "Fiado",
};

export default function CortePage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fecha, setFecha] = useState(ymdLocal(new Date()));
  const [tiendaNombre, setTiendaNombre] = useState("MWStock");
  const [clientesActivo, setClientesActivo] = useState(false);
  const [caja, setCaja] = useState<CajaEstado | null>(null);
  const [fondoInput, setFondoInput] = useState("");
  const [umbralInput, setUmbralInput] = useState("");
  const [montoRetiro, setMontoRetiro] = useState("");
  const [notaRetiro, setNotaRetiro] = useState("");
  const [guardandoCaja, setGuardandoCaja] = useState(false);

  function cargarCaja() {
    fetch("/api/caja")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && !d.error) {
          setCaja(d);
          setFondoInput(String(d.fondoCaja ?? ""));
          setUmbralInput(
            d.umbralCajaPeligro != null ? String(d.umbralCajaPeligro) : ""
          );
        }
      })
      .catch(() => {});
  }

  async function guardarConfig() {
    setGuardandoCaja(true);
    try {
      const r = await fetch("/api/caja", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fondoCaja: Number(fondoInput) || 0,
          umbralCajaPeligro:
            umbralInput.trim() === "" ? null : Number(umbralInput),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo guardar");
      setCaja(d);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardandoCaja(false);
    }
  }

  async function hacerRetiro() {
    const monto = Number(montoRetiro);
    if (!monto || monto <= 0) {
      alert("Escribe un monto válido.");
      return;
    }
    if (
      caja &&
      monto > caja.efectivoEnCaja &&
      !confirm(
        `Vas a retirar $${monto.toFixed(2)} pero en caja hay $${caja.efectivoEnCaja.toFixed(
          2
        )}. ¿Continuar?`
      )
    ) {
      return;
    }
    setGuardandoCaja(true);
    try {
      const r = await fetch("/api/caja/retiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monto, nota: notaRetiro.trim() || null }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo retirar");
      setMontoRetiro("");
      setNotaRetiro("");
      cargarCaja();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardandoCaja(false);
    }
  }

  useEffect(() => {
    cargarCaja();
    fetch("/api/ventas")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setVentas(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setCargando(false));
    fetch("/api/tienda")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.nombre) setTiendaNombre(d.nombre);
        setClientesActivo(normalizarModulos(d?.modulos).clientes);
      })
      .catch(() => {});
    fetch("/api/abonos")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAbonos(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const delDia = useMemo(
    () => ventas.filter((v) => ymdLocal(new Date(v.createdAt)) === fecha),
    [ventas, fecha]
  );

  const resumen = useMemo(() => {
    const base = {
      EFECTIVO: { conteo: 0, monto: 0 },
      TARJETA: { conteo: 0, monto: 0 },
      TRANSFERENCIA: { conteo: 0, monto: 0 },
      FIADO: { conteo: 0, valor: 0, enganche: 0 },
    };
    for (const v of delDia) {
      const total = Number(v.total);
      if (v.metodoPago === "FIADO") {
        base.FIADO.conteo += 1;
        base.FIADO.valor += total;
        base.FIADO.enganche += Number(v.montoRecibido || 0);
      } else if (v.metodoPago === "TARJETA") {
        base.TARJETA.conteo += 1;
        base.TARJETA.monto += total;
      } else if (v.metodoPago === "TRANSFERENCIA") {
        base.TRANSFERENCIA.conteo += 1;
        base.TRANSFERENCIA.monto += total;
      } else {
        base.EFECTIVO.conteo += 1;
        base.EFECTIVO.monto += total;
      }
    }
    // Abonos cobrados este día (incluye los enganches de los fiados de hoy,
    // por eso NO sumamos base.FIADO.enganche aparte: evitamos duplicar).
    const abonosDelDia = abonos.filter(
      (a) => ymdLocal(new Date(a.createdAt)) === fecha
    );
    const sumAbonos = abonosDelDia.reduce((s, a) => s + Number(a.monto), 0);

    const recibido =
      base.EFECTIVO.monto +
      base.TARJETA.monto +
      base.TRANSFERENCIA.monto +
      sumAbonos;
    const vendido =
      base.EFECTIVO.monto +
      base.TARJETA.monto +
      base.TRANSFERENCIA.monto +
      base.FIADO.valor;
    const pendiente = base.FIADO.valor - base.FIADO.enganche;
    return {
      base,
      recibido,
      vendido,
      pendiente,
      sumAbonos,
      abonosCount: abonosDelDia.length,
    };
  }, [delDia, abonos, fecha]);

  function moverDia(delta: number) {
    const d = new Date(fecha + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setFecha(ymdLocal(d));
  }

  const esHoy = fecha === ymdLocal(new Date());
  const fechaBonita = new Date(fecha + "T12:00:00").toLocaleDateString(
    "es-MX",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Administrador
            </p>
            <h1 className="mt-2 text-3xl font-bold">Corte de caja</h1>
          </div>
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-neutral-200"
          >
            Imprimir / Guardar
          </button>
        </div>

        {/* Selector de fecha */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => moverDia(-1)}
            className="rounded-lg bg-neutral-800 px-3 py-2 font-bold hover:bg-neutral-700"
          >
            ←
          </button>
          <input
            type="date"
            value={fecha}
            max={ymdLocal(new Date())}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 outline-none focus:border-white"
          />
          <button
            onClick={() => moverDia(1)}
            disabled={esHoy}
            className="rounded-lg bg-neutral-800 px-3 py-2 font-bold hover:bg-neutral-700 disabled:opacity-40"
          >
            →
          </button>
        </div>

        <div>
          <h2 className="text-lg font-semibold capitalize">{fechaBonita}</h2>
          <p className="text-sm text-neutral-500">{tiendaNombre}</p>
        </div>

        {/* === Caja física (efectivo) === */}
        {caja && (
          <div className="space-y-4">
            {caja.peligro && (
              <div className="rounded-2xl border border-red-700 bg-red-950/40 p-4 text-sm text-red-200">
                ⚠️{" "}
                <span className="font-semibold">
                  Hay mucho efectivo en caja
                </span>{" "}
                (${caja.efectivoEnCaja.toFixed(2)}, alerta a partir de $
                {caja.umbralCajaPeligro?.toFixed(2)}). Por seguridad, retira
                efectivo y guárdalo.
              </div>
            )}

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <h3 className="font-semibold">Caja física (efectivo)</h3>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Fondo de cambio</span>
                  <span>${caja.fondoCaja.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">
                    + Efectivo de ventas (hoy)
                  </span>
                  <span>${caja.efectivoVentasHoy.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">+ Abonos (hoy)</span>
                  <span>${caja.abonosHoy.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">− Retiros (hoy)</span>
                  <span>−${caja.retirosHoy.toFixed(2)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-neutral-800 pt-2 text-base">
                  <span className="font-semibold">Efectivo en caja ahora</span>
                  <span
                    className={`font-bold ${
                      caja.peligro ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    ${caja.efectivoEnCaja.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Configuración: fondo + umbral */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2 print:hidden">
                <label className="text-sm">
                  <span className="text-neutral-400">Fondo de cambio</span>
                  <input
                    type="number"
                    value={fondoInput}
                    onChange={(e) => setFondoInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-white"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-neutral-400">
                    Alertar si pasa de (vacío = sin alerta)
                  </span>
                  <input
                    type="number"
                    value={umbralInput}
                    onChange={(e) => setUmbralInput(e.target.value)}
                    placeholder="Ej. 3000"
                    className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-white"
                  />
                </label>
              </div>
              <button
                onClick={guardarConfig}
                disabled={guardandoCaja}
                className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50 print:hidden"
              >
                Guardar configuración
              </button>

              {/* Retiro de efectivo (solo admin) */}
              <div className="mt-6 border-t border-neutral-800 pt-4 print:hidden">
                <h4 className="text-sm font-semibold">Retirar efectivo</h4>
                <p className="text-xs text-neutral-500">
                  Solo tú (administrador) puedes sacar dinero de la caja.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    type="number"
                    value={montoRetiro}
                    onChange={(e) => setMontoRetiro(e.target.value)}
                    placeholder="Monto"
                    className="w-32 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-white"
                  />
                  <input
                    value={notaRetiro}
                    onChange={(e) => setNotaRetiro(e.target.value)}
                    placeholder="Nota (opcional)"
                    className="min-w-[140px] flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-white"
                  />
                  <button
                    onClick={hacerRetiro}
                    disabled={guardandoCaja}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-500 disabled:opacity-50"
                  >
                    Retirar
                  </button>
                </div>
                {caja.retiros.length > 0 && (
                  <div className="mt-3 space-y-1 text-sm">
                    {caja.retiros.map((r) => (
                      <div
                        key={r.id}
                        className="flex justify-between border-b border-neutral-800 pb-1"
                      >
                        <span className="text-neutral-400">
                          {hora(r.createdAt)}
                          {r.nota ? ` · ${r.nota}` : ""}
                        </span>
                        <span className="font-semibold text-red-400">
                          −${r.monto.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : (
          <>
            {/* Totales principales */}
            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-green-800 bg-green-950/30 p-5">
                <p className="text-sm text-neutral-400">Dinero recibido</p>
                <p className="mt-2 text-3xl font-bold text-green-400">
                  ${resumen.recibido.toFixed(2)}
                </p>
              </article>
              <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-sm text-neutral-400">Valor vendido</p>
                <p className="mt-2 text-3xl font-bold">
                  ${resumen.vendido.toFixed(2)}
                </p>
              </article>
              <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-sm text-neutral-400"># Ventas</p>
                <p className="mt-2 text-3xl font-bold">{delDia.length}</p>
              </article>
            </div>

            {/* Desglose por método */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <h3 className="font-semibold">Desglose por método de pago</h3>
              <div className="mt-3 space-y-2 text-sm">
                {(["EFECTIVO", "TARJETA", "TRANSFERENCIA"] as const).map((m) => (
                  <div
                    key={m}
                    className="flex justify-between border-b border-neutral-800 pb-2"
                  >
                    <span className="text-neutral-300">
                      {METODO_LABEL[m]}{" "}
                      <span className="text-neutral-500">
                        ({resumen.base[m].conteo})
                      </span>
                    </span>
                    <span className="font-semibold">
                      ${resumen.base[m].monto.toFixed(2)}
                    </span>
                  </div>
                ))}
                {clientesActivo && (
                  <>
                    <div className="flex justify-between border-b border-neutral-800 pb-2">
                      <span className="text-neutral-300">
                        Fiado — a crédito{" "}
                        <span className="text-neutral-500">
                          ({resumen.base.FIADO.conteo})
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="font-semibold text-amber-400">
                          ${resumen.base.FIADO.valor.toFixed(2)}
                        </span>
                        <span className="block text-xs text-neutral-500">
                          no entra a caja
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-300">
                        Abonos cobrados hoy{" "}
                        <span className="text-neutral-500">
                          ({resumen.abonosCount})
                        </span>
                      </span>
                      <span className="font-semibold text-green-400">
                        ${resumen.sumAbonos.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Recibido en caja</span>
                  <span className="font-bold text-green-400">
                    ${resumen.recibido.toFixed(2)}
                  </span>
                </div>
                {clientesActivo && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">
                      Quedó por cobrar (fiado)
                    </span>
                    <span className="font-bold text-amber-400">
                      ${resumen.pendiente.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de ventas */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <h3 className="font-semibold">Ventas del día</h3>
              {delDia.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-400">
                  No hubo ventas este día.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {delDia
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime()
                    )
                    .map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between border-b border-neutral-800 pb-2 text-sm"
                      >
                        <div>
                          <span className="text-neutral-400">
                            {hora(v.createdAt)}
                          </span>{" "}
                          · {METODO_LABEL[v.metodoPago] || v.metodoPago}
                          {v.clienteNombre ? (
                            <span className="text-neutral-500">
                              {" "}
                              · {v.clienteNombre}
                            </span>
                          ) : null}
                          <span className="block text-xs text-neutral-600">
                            {v.items
                              .map((i) => `${i.cantidad}x ${i.productoNombre}`)
                              .join(", ")}
                          </span>
                        </div>
                        <span className="font-semibold">
                          ${Number(v.total).toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {clientesActivo && (
              <p className="text-xs text-neutral-600">
                &quot;Recibido en caja&quot; = efectivo + tarjeta +
                transferencia + abonos cobrados hoy (incluye enganches). El
                fiado a crédito no entra a caja hasta que se abona.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
