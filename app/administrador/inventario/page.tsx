"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Coleccion = {
  id: string;
  nombre: string;
  estado: string;
};

type Producto = {
  id: string;
  estado: string;
  colecciones: { coleccion: { id: string } }[];
  variantes: { stock: number; estado: string }[];
};

type ResumenColeccion = {
  id: string;
  nombre: string;
  productos: number;
  stock: number;
};

export default function InventarioPage() {
  const [resumen, setResumen] = useState<ResumenColeccion[]>([]);
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    const [colRes, prodRes] = await Promise.all([
      fetch("/api/colecciones"),
      fetch("/api/productos"),
    ]);

    const colecciones: Coleccion[] = await colRes.json();
    const productos: Producto[] = await prodRes.json();

    const activas = colecciones.filter((c) => c.estado !== "ARCHIVADA");

    const data: ResumenColeccion[] = activas.map((coleccion) => {
      const productosDeColeccion = productos.filter(
        (producto) =>
          producto.estado !== "ARCHIVADO" &&
          producto.colecciones.some(
            (pc) => pc.coleccion.id === coleccion.id
          )
      );

      const stock = productosDeColeccion.reduce(
        (total, producto) =>
          total +
          producto.variantes
            .filter((v) => v.estado !== "ARCHIVADA")
            .reduce((suma, v) => suma + v.stock, 0),
        0
      );

      return {
        id: coleccion.id,
        nombre: coleccion.nombre,
        productos: productosDeColeccion.length,
        stock,
      };
    });

    setResumen(data);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">Inventario</h1>

          <p className="mt-2 text-neutral-400">
            Elige una colección para ver y ajustar el stock de sus productos.
          </p>
        </div>

        {cargando ? (
          <p className="text-neutral-400">Cargando...</p>
        ) : resumen.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-neutral-400">
            Todavía no hay colecciones.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumen.map((coleccion) => (
              <Link
                key={coleccion.id}
                href={`/administrador/inventario/${coleccion.id}`}
                className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600"
              >
                <h2 className="text-xl font-semibold">{coleccion.nombre}</h2>

                <div className="mt-4 flex gap-6">
                  <div>
                    <p className="text-3xl font-bold">{coleccion.productos}</p>
                    <p className="text-xs text-neutral-500">productos</p>
                  </div>

                  <div>
                    <p className="text-3xl font-bold">{coleccion.stock}</p>
                    <p className="text-xs text-neutral-500">piezas en stock</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
