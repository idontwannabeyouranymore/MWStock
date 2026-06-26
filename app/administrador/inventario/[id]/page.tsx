"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Variante = {
  id: string;
  talla: string;
  color: string | null;
  stock: number;
  estado: string;
};

type Producto = {
  id: string;
  nombre: string;
  marca: string | null;
  estado: string;
  colecciones: { coleccion: { id: string; nombre: string } }[];
  variantes: Variante[];
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
    id: string;
    talla: string;
    color: string | null;
    producto: { nombre: string };
  };
};

export default function InventarioColeccionPage() {
  const params = useParams<{ id: string }>();
  const coleccionId = params.id;

  const [nombreColeccion, setNombreColeccion] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [historial, setHistorial] = useState<Movimiento[]>([]);
  const [cargandoId, setCargandoId] = useState<string | null>(null);

  const cargarProductos = useCallback(async () => {
    const response = await fetch("/api/productos");
    const data: Producto[] = await response.json();

    const deColeccion = data.filter(
      (producto) =>
        producto.estado !== "ARCHIVADO" &&
        producto.colecciones.some((pc) => pc.coleccion.id === coleccionId)
    );

    setProductos(deColeccion);

    const nombre = deColeccion[0]?.colecciones.find(
      (pc) => pc.coleccion.id === coleccionId
    )?.coleccion.nombre;

    if (nombre) {
      setNombreColeccion(nombre);
    }
  }, [coleccionId]);

  const cargarHistorial = useCallback(async () => {
    const response = await fetch("/api/inventario/historial");
    const data: Movimiento[] = await response.json();
    setHistorial(data);
  }, []);

  async function registrarMovimiento(
    varianteId: string,
    tipo: "VENTA" | "ENTRADA"
  ) {
    setCargandoId(varianteId);

    const response = await fetch("/api/inventario/movimiento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        varianteId,
        tipo,
        cantidad: 1,
        nota: tipo === "VENTA" ? "Venta desde panel" : "Entrada desde panel",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || "Error al modificar inventario");
    }

    await cargarProductos();
    await cargarHistorial();
    setCargandoId(null);
  }

  useEffect(() => {
    cargarProductos();
    cargarHistorial();
  }, [cargarProductos, cargarHistorial]);

  // Solo los movimientos de variantes que pertenecen a esta colección.
  const idsVariantes = new Set(
    productos.flatMap((producto) => producto.variantes.map((v) => v.id))
  );
  const historialColeccion = historial.filter((m) =>
    idsVariantes.has(m.variante.id)
  );

  // Agrupa los productos por marca para no verlos amontonados.
  const porMarca = new Map<string, Producto[]>();
  for (const p of productos) {
    const m = (p.marca || "").trim() || "Otros";
    if (!porMarca.has(m)) porMarca.set(m, []);
    porMarca.get(m)!.push(p);
  }
  const gruposMarca = [...porMarca.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  const agruparPorMarca = gruposMarca.length > 1;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-5xl space-y-8">
        <div>
          <Link
            href="/administrador/inventario"
            className="text-sm text-neutral-400 hover:text-white"
          >
            ← Volver a colecciones
          </Link>

          <h1 className="mt-3 text-3xl font-bold">
            Inventario{nombreColeccion ? `: ${nombreColeccion}` : ""}
          </h1>

          <p className="mt-2 text-neutral-400">
            Descuenta ventas, agrega entradas y revisa los movimientos de stock.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Stock por producto</h2>

          {productos.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
              Esta colección no tiene productos.
            </p>
          ) : (
            <div className="space-y-8">
              {gruposMarca.map(([marca, prods]) => (
                <div key={marca} className="space-y-4">
                  {agruparPorMarca && (
                    <h3 className="border-b border-neutral-800 pb-2 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                      {marca}{" "}
                      <span className="text-neutral-600">({prods.length})</span>
                    </h3>
                  )}
                  <div className="grid gap-4">
                    {prods.map((producto) => {
                      const tallas = producto.variantes.filter(
                        (v) => v.estado !== "ARCHIVADA"
                      );

                      return (
                  <article
                    key={producto.id}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
                  >
                    <h3 className="text-lg font-semibold">{producto.nombre}</h3>

                    {tallas.length === 0 ? (
                      <p className="mt-3 text-sm text-neutral-500">
                        Sin tallas registradas.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {tallas.map((variante) => (
                          <div
                            key={variante.id}
                            className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-semibold">
                                {variante.talla}
                                {variante.color ? ` · ${variante.color}` : ""}
                              </p>
                              <p className="text-2xl font-bold">
                                Stock: {variante.stock}
                              </p>
                            </div>

                            <div className="flex gap-3">
                              <button
                                disabled={cargandoId === variante.id}
                                onClick={() =>
                                  registrarMovimiento(variante.id, "VENTA")
                                }
                                className="rounded-xl bg-red-500 px-4 py-3 font-semibold text-white disabled:opacity-50"
                              >
                                -1 vendido
                              </button>

                              <button
                                disabled={cargandoId === variante.id}
                                onClick={() =>
                                  registrarMovimiento(variante.id, "ENTRADA")
                                }
                                className="rounded-xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
                              >
                                +1 entrada
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Movimientos de esta colección</h2>

          {historialColeccion.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
              Todavía no hay movimientos.
            </p>
          ) : (
            <div className="grid gap-3">
              {historialColeccion.map((movimiento) => (
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
                        Talla {movimiento.variante.talla}
                        {movimiento.variante.color
                          ? ` · ${movimiento.variante.color}`
                          : ""}
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
          )}
        </section>
      </section>
    </main>
  );
}
