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
    precio: string;
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

export default function VentasPage() {
  const [variantes, setVariantes] = useState<Variante[]>([]);
  const [historial, setHistorial] = useState<Movimiento[]>([]);

  const [varianteId, setVarianteId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [cargando, setCargando] = useState(false);

  async function obtenerVariantes() {
    const response = await fetch("/api/variantes");
    const data = await response.json();

    const disponibles = data.filter((variante: Variante) => variante.estado !== "ARCHIVADA");

    setVariantes(disponibles);

    if (disponibles.length > 0) {
      setVarianteId(disponibles[0].id);
    }
  }

  async function obtenerHistorial() {
    const response = await fetch("/api/inventario/historial");
    const data = await response.json();

    const ventas = data.filter(
      (movimiento: Movimiento) => movimiento.tipo === "VENTA"
    );

    setHistorial(ventas);
  }

  async function registrarVenta(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!varianteId) {
      alert("Selecciona una variante");
      return;
    }

    if (!cantidad || Number(cantidad) <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    setCargando(true);

    const response = await fetch("/api/inventario/movimiento", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        varianteId,
        tipo: "VENTA",
        cantidad: Number(cantidad),
        nota: "Venta registrada desde módulo de ventas",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || "No se pudo registrar la venta");
      setCargando(false);
      return;
    }

    setCantidad("1");
    await obtenerVariantes();
    await obtenerHistorial();

    setCargando(false);
  }

  useEffect(() => {
    obtenerVariantes();
    obtenerHistorial();
  }, []);

  const varianteSeleccionada = variantes.find(
    (variante) => variante.id === varianteId
  );

  const totalVenta =
    varianteSeleccionada && cantidad
      ? Number(varianteSeleccionada.producto.precio) * Number(cantidad)
      : 0;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">Ventas</h1>

          <p className="mt-2 text-neutral-400">
            Registra ventas y descuenta stock automáticamente.
          </p>
        </div>

        <form
          onSubmit={registrarVenta}
          className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <h2 className="text-xl font-semibold">Nueva venta</h2>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Producto / variante
            </label>

            <select
              value={varianteId}
              onChange={(event) => setVarianteId(event.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            >
              {variantes.map((variante) => (
                <option key={variante.id} value={variante.id}>
                  {variante.producto.nombre} | Talla {variante.talla} |{" "}
                  {variante.color || "Sin color"} | Stock: {variante.stock}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Cantidad vendida
            </label>

            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            />
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-400">Total estimado</p>

            <p className="mt-1 text-3xl font-bold">
              ${totalVenta.toFixed(2)}
            </p>
          </div>

          <button
            disabled={cargando}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            {cargando ? "Registrando..." : "Registrar venta"}
          </button>
        </form>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Ventas recientes</h2>

          {historial.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
              Todavía no hay ventas registradas.
            </p>
          ) : (
            <div className="grid gap-3">
              {historial.map((venta) => (
                <article
                  key={venta.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
                >
                  <p className="font-semibold">
                    {venta.variante.producto.nombre}
                  </p>

                  <p className="text-sm text-neutral-400">
                    Talla {venta.variante.talla} ·{" "}
                    {venta.variante.color || "Sin color"}
                  </p>

                  <p className="mt-2 text-sm text-neutral-300">
                    Vendidas: {venta.cantidad}
                  </p>

                  <p className="text-sm text-neutral-500">
                    Stock: {venta.stockAnterior} → {venta.stockNuevo}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}