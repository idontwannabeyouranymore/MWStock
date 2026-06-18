"use client";

import { useEffect, useMemo, useState } from "react";

type VentaItem = {
  productoNombre: string;
  talla: string;
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
};

type Venta = {
  id: string;
  total: string;
  metodoPago: string;
  montoRecibido: string | null;
  cambio: string | null;
  clienteNombre: string | null;
  clienteTelefono: string | null;
  createdAt: string;
  items: VentaItem[];
};

function fechaLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

const METODO_ETIQUETA: Record<string, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  FIADO: "Fiado",
};

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [fecha, setFecha] = useState(fechaLocal(new Date()));
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    const response = await fetch("/api/ventas");
    const data: Venta[] = await response.json();
    setVentas(data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const ventasDelDia = useMemo(
    () => ventas.filter((v) => fechaLocal(new Date(v.createdAt)) === fecha),
    [ventas, fecha]
  );

  const totalDinero = ventasDelDia.reduce(
    (suma, v) => suma + Number(v.total),
    0
  );

  const totalPiezas = ventasDelDia.reduce(
    (suma, v) => suma + v.items.reduce((s, i) => s + i.cantidad, 0),
    0
  );

  const porProducto = useMemo(() => {
    const mapa = new Map<string, { cantidad: number; dinero: number }>();
    for (const venta of ventasDelDia) {
      for (const item of venta.items) {
        const actual = mapa.get(item.productoNombre) || {
          cantidad: 0,
          dinero: 0,
        };
        actual.cantidad += item.cantidad;
        actual.dinero += Number(item.subtotal);
        mapa.set(item.productoNombre, actual);
      }
    }
    return Array.from(mapa.entries())
      .map(([nombre, datos]) => ({ nombre, ...datos }))
      .sort((a, b) => b.dinero - a.dinero);
  }, [ventasDelDia]);

  const porMetodo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const venta of ventasDelDia) {
      mapa.set(
        venta.metodoPago,
        (mapa.get(venta.metodoPago) || 0) + Number(venta.total)
      );
    }
    return Array.from(mapa.entries());
  }, [ventasDelDia]);

  const esHoy = fecha === fechaLocal(new Date());

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Ventas</h1>
          <p className="mt-2 text-neutral-400">
            Resumen de las ventas registradas en el punto de venta.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-sm text-neutral-300">Día</label>
            <input
              type="date"
              value={fecha}
              max={fechaLocal(new Date())}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-white outline-none focus:border-white"
            />
          </div>
          {!esHoy && (
            <button
              onClick={() => setFecha(fechaLocal(new Date()))}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold"
            >
              Hoy
            </button>
          )}
        </div>

        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-sm text-neutral-400">Dinero del día</p>
                <p className="mt-3 text-4xl font-bold">
                  ${totalDinero.toFixed(2)}
                </p>
              </article>
              <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-sm text-neutral-400">Piezas vendidas</p>
                <p className="mt-3 text-4xl font-bold">{totalPiezas}</p>
              </article>
              <article className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
                <p className="text-sm text-neutral-400">Ventas</p>
                <p className="mt-3 text-4xl font-bold">{ventasDelDia.length}</p>
              </article>
            </section>

            {porMetodo.length > 0 && (
              <section className="flex flex-wrap gap-3">
                {porMetodo.map(([metodo, monto]) => (
                  <span
                    key={metodo}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm"
                  >
                    {METODO_ETIQUETA[metodo] || metodo}:{" "}
                    <span className="font-semibold">${monto.toFixed(2)}</span>
                  </span>
                ))}
              </section>
            )}

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Productos vendidos</h2>

              {porProducto.length === 0 ? (
                <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
                  No hay ventas este día.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-neutral-800">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-neutral-900 text-neutral-400">
                      <tr>
                        <th className="px-5 py-3">Producto</th>
                        <th className="px-5 py-3 text-center">Cantidad</th>
                        <th className="px-5 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porProducto.map((fila) => (
                        <tr
                          key={fila.nombre}
                          className="border-t border-neutral-800 bg-neutral-950"
                        >
                          <td className="px-5 py-3 font-semibold">
                            {fila.nombre}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {fila.cantidad}
                          </td>
                          <td className="px-5 py-3 text-right">
                            ${fila.dinero.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-neutral-700 bg-neutral-900 font-bold">
                        <td className="px-5 py-3">Total</td>
                        <td className="px-5 py-3 text-center">{totalPiezas}</td>
                        <td className="px-5 py-3 text-right">
                          ${totalDinero.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Tickets del día</h2>

              {ventasDelDia.length === 0 ? (
                <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
                  Sin tickets este día.
                </p>
              ) : (
                <div className="grid gap-3">
                  {ventasDelDia.map((venta) => (
                    <article
                      key={venta.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-neutral-400">
                            {new Date(venta.createdAt).toLocaleTimeString(
                              "es-MX",
                              { hour: "2-digit", minute: "2-digit" }
                            )}{" "}
                            · {METODO_ETIQUETA[venta.metodoPago] ||
                              venta.metodoPago}
                            {venta.clienteNombre
                              ? ` · ${venta.clienteNombre}`
                              : ""}
                          </p>
                          <div className="mt-1 text-sm text-neutral-300">
                            {venta.items.map((item, i) => (
                              <span key={i}>
                                {item.cantidad}x {item.productoNombre} (
                                {item.talla})
                                {i < venta.items.length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-lg font-bold">
                          ${Number(venta.total).toFixed(2)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
