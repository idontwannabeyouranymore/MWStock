"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Abono = {
  id: string;
  monto: string;
  nota: string | null;
  createdAt: string;
};

type Deuda = {
  id: string;
  concepto: string;
  monto: string;
  saldo: string;
  estado: "PENDIENTE" | "PAGADA";
  createdAt: string;
  abonos: Abono[];
  venta: { id: string } | null;
};

type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  nota: string | null;
  saldoTotal: number;
  deudas: Deuda[];
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(true);

  // Nueva deuda manual
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");

  // Abonos por deuda: { [deudaId]: monto }
  const [abonoMonto, setAbonoMonto] = useState<Record<string, string>>({});
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await fetch(`/api/clientes/${id}`);
    if (r.ok) {
      setCliente(await r.json());
    } else {
      setCliente(null);
    }
    setCargando(false);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregarDeuda(e: React.FormEvent) {
    e.preventDefault();
    const m = Number(monto);
    if (!concepto.trim() || !Number.isFinite(m) || m <= 0) {
      alert("Pon un concepto y un monto válido");
      return;
    }
    setProcesando(true);
    try {
      const r = await fetch("/api/deudas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: id, concepto, monto: m }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setConcepto("");
      setMonto("");
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setProcesando(false);
    }
  }

  async function abonar(deudaId: string) {
    const m = Number(abonoMonto[deudaId]);
    if (!Number.isFinite(m) || m <= 0) {
      alert("Pon un monto de abono válido");
      return;
    }
    setProcesando(true);
    try {
      const r = await fetch("/api/abonos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deudaId, monto: m }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setAbonoMonto((prev) => ({ ...prev, [deudaId]: "" }));
      await cargar();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setProcesando(false);
    }
  }

  async function borrarCliente() {
    if (!confirm("¿Borrar este cliente? Solo se puede si no debe nada.")) return;
    const r = await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    const data = await r.json();
    if (!r.ok) {
      alert(data.error || "No se pudo borrar");
      return;
    }
    router.push("/administrador/clientes");
  }

  function recordarWhatsApp() {
    if (!cliente?.telefono) return;
    const tel = cliente.telefono.replace(/\D/g, "");
    const texto = `Hola ${cliente.nombre}, te recuerdo tu saldo pendiente de $${cliente.saldoTotal.toFixed(
      2
    )}. ¡Gracias!`;
    window.open(
      `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`,
      "_blank"
    );
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        <p className="text-neutral-400">Cargando...</p>
      </main>
    );
  }

  if (!cliente) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        <p className="text-neutral-400">Cliente no encontrado.</p>
        <Link
          href="/administrador/clientes"
          className="mt-4 inline-block text-sm text-neutral-300 underline"
        >
          ← Volver a clientes
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/administrador/clientes"
          className="text-sm text-neutral-400 hover:text-white"
        >
          ← Clientes
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{cliente.nombre}</h1>
            {cliente.telefono && (
              <p className="mt-1 text-neutral-400">{cliente.telefono}</p>
            )}
            {cliente.nota && (
              <p className="mt-1 text-sm text-neutral-500">{cliente.nota}</p>
            )}
          </div>
          <button
            onClick={borrarCliente}
            className="rounded-lg border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:border-red-700 hover:text-red-400"
          >
            Borrar cliente
          </button>
        </div>

        {/* Saldo */}
        <div
          className={`rounded-2xl border p-5 ${
            cliente.saldoTotal > 0
              ? "border-amber-800 bg-amber-950/30"
              : "border-green-800 bg-green-950/30"
          }`}
        >
          <p className="text-sm text-neutral-400">Saldo pendiente</p>
          <p
            className={`mt-1 text-4xl font-bold ${
              cliente.saldoTotal > 0 ? "text-amber-400" : "text-green-400"
            }`}
          >
            ${cliente.saldoTotal.toFixed(2)}
          </p>
          {cliente.saldoTotal > 0 && cliente.telefono && (
            <button
              onClick={recordarWhatsApp}
              className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Recordar por WhatsApp
            </button>
          )}
        </div>

        {/* Nueva deuda manual */}
        <form
          onSubmit={agregarDeuda}
          className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="font-semibold">Registrar deuda (fiado manual)</h2>
          <input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Concepto (ej. Perfume Sauvage 5ml)"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
          />
          <div className="flex gap-3">
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={procesando}
              className="flex-shrink-0 rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        </form>

        {/* Lista de deudas */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Deudas</h2>
          {cliente.deudas.length === 0 ? (
            <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
              Este cliente no tiene deudas registradas.
            </p>
          ) : (
            cliente.deudas.map((d) => {
              const pagada = d.estado === "PAGADA";
              return (
                <div
                  key={d.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{d.concepto}</p>
                      <p className="text-xs text-neutral-500">
                        {fecha(d.createdAt)}
                        {d.venta ? " · Venta POS" : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        pagada
                          ? "bg-green-900/50 text-green-400"
                          : "bg-amber-900/50 text-amber-300"
                      }`}
                    >
                      {pagada ? "Pagada" : "Pendiente"}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-neutral-400">
                      Total: ${Number(d.monto).toFixed(2)}
                    </span>
                    <span
                      className={`font-bold ${
                        pagada ? "text-green-400" : "text-amber-400"
                      }`}
                    >
                      Saldo: ${Number(d.saldo).toFixed(2)}
                    </span>
                  </div>

                  {/* Abonos */}
                  {d.abonos.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-neutral-800 pt-3">
                      {d.abonos.map((a) => (
                        <div
                          key={a.id}
                          className="flex justify-between text-xs text-neutral-400"
                        >
                          <span>
                            Abono {fecha(a.createdAt)}
                            {a.nota ? ` · ${a.nota}` : ""}
                          </span>
                          <span className="text-green-400">
                            +${Number(a.monto).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Registrar abono */}
                  {!pagada && (
                    <div className="mt-3 flex gap-2 border-t border-neutral-800 pt-3">
                      <input
                        value={abonoMonto[d.id] || ""}
                        onChange={(e) =>
                          setAbonoMonto((prev) => ({
                            ...prev,
                            [d.id]: e.target.value,
                          }))
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Abono"
                        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-white"
                      />
                      <button
                        onClick={() => abonar(d.id)}
                        disabled={procesando}
                        className="flex-shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Abonar
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
