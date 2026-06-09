"use client";

import { useEffect, useState } from "react";

type Variante = {
  id: string;
  talla: string;
  color: string | null;
  stock: number;
  estado: string;
  producto: {
    id: string;
    nombre: string;
    estado: string;
  };
};

type Movimiento = {
  id: string;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  nota: string | null;
  createdAt: string;
  variante: {
    talla: string;
    color: string | null;
    producto: {
      nombre: string;
    };
  };
};

export default function InventarioPage() {
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [historial, setHistorial] = useState<Movimiento[]>([]);
  const [cargandoId, setCargandoId] = useState<string | null>(null);

  async function obtenerVariantes() {
    const response = await fetch("/api/variantes");
    const data = await response.json();
    setVariantes(data);
  }

  async function obtenerHistorial() {
    const response = await fetch("/api/inventario/historial");
    const data = await response.json();
    setHistorial(data);
  }

  async function registrarMovimiento(
    varianteId: string,
    tipo: "VENTA" | "ENTRADA",
    cantidad: number
  ) {
    setCargandoId(varianteId);

    const response = await fetch("/api/inventario/movimiento", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        varianteId,
        tipo,
        cantidad,
        nota: tipo === "VENTA" ? "Venta desde panel" : "Entrada desde panel",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || "Error al modificar inventario");
    }

    await obtenerVariantes();
    await obtenerHistorial();

    setCargandoId(null);
  }

  useEffect(() => {
    obtenerVariantes();
    obtenerHistorial();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Inventario
          </h1>

          <p className="mt-2 text-neutral-400">
            Descuenta ventas, agrega entradas y revisa movimientos de stock.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            Stock actual
          </h2>

          <div className="grid gap-4">
            {variantes.map((variante) => (
              <article
                key={variante.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {variante.producto.nombre}
                    </h3>

                    <p className="text-sm text-neutral-400">
                      Talla: {variante.talla} · Color:{" "}
                      {variante.color || "Sin color"}
                    </p>

                    <p className="mt-2 text-2xl font-bold">
                      Stock: {variante.stock}
                    </p>

                    <p className="mt-1 text-sm text-neutral-500">
                      Estado variante: {variante.estado}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      disabled={cargandoId === variante.id}
                      onClick={() =>
                        registrarMovimiento(variante.id, "VENTA", 1)
                      }
                      className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
                    >
                      -1 vendido
                    </button>

                    <button
                      disabled={cargandoId === variante.id}
                      onClick={() =>
                        registrarMovimiento(variante.id, "ENTRADA", 1)
                      }
                      className="rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
                    >
                      +1 entrada
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            Historial de movimientos
          </h2>

          <div className="grid gap-3">
            {historial.map((movimiento) => (
              <article
                key={movimiento.id}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {movimiento.variante.producto.nombre}
                    </p>

                    <p className="text-sm text-neutral-400">
                      {movimiento.variante.talla} ·{" "}
                      {movimiento.variante.color || "Sin color"}
                    </p>

                    <p className="text-sm text-neutral-500">
                      {movimiento.nota || "Sin nota"}
                    </p>
                  </div>

                  <div className="text-sm text-neutral-300">
                    <p>Tipo: {movimiento.tipo}</p>
                    <p>
                      {movimiento.stockAnterior} → {movimiento.stockNuevo}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}