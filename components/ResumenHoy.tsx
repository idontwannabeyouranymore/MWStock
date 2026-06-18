"use client";

import { useEffect, useState } from "react";

type Venta = {
  total: string;
  createdAt: string;
  metodoPago: string;
  montoRecibido: string | null;
};

function esHoy(fechaIso: string) {
  const f = new Date(fechaIso);
  const h = new Date();
  return (
    f.getFullYear() === h.getFullYear() &&
    f.getMonth() === h.getMonth() &&
    f.getDate() === h.getDate()
  );
}

export default function ResumenHoy() {
  const [dinero, setDinero] = useState(0);
  const [conteo, setConteo] = useState(0);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/ventas")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Venta[]) => {
        const hoy = Array.isArray(data)
          ? data.filter((v) => esHoy(v.createdAt))
          : [];
        // En fiado solo entra el enganche; en lo demás, el total.
        setDinero(
          hoy.reduce(
            (s, v) =>
              s +
              (v.metodoPago === "FIADO"
                ? Number(v.montoRecibido || 0)
                : Number(v.total)),
            0
          )
        );
        setConteo(hoy.length);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <article className="rounded-2xl border border-green-800 bg-green-950/30 p-5">
        <p className="text-sm text-neutral-400">Dinero de hoy</p>
        <p className="mt-2 text-4xl font-bold text-green-400">
          {cargando ? "—" : `$${dinero.toFixed(2)}`}
        </p>
      </article>
      <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <p className="text-sm text-neutral-400">Ventas de hoy</p>
        <p className="mt-2 text-4xl font-bold">{cargando ? "—" : conteo}</p>
      </article>
    </section>
  );
}
