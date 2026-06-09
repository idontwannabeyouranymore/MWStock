import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [
    totalColecciones,
    totalProductos,
    productosAgotados,
    totalVariantes,
    stockTotal,
    movimientosRecientes,
  ] = await Promise.all([
    prisma.coleccion.count({
      where: {
        estado: {
          not: "ARCHIVADA",
        },
      },
    }),

    prisma.producto.count({
      where: {
        estado: {
          not: "ARCHIVADO",
        },
      },
    }),

    prisma.producto.count({
      where: {
        estado: "AGOTADO",
      },
    }),

    prisma.variante.count({
      where: {
        estado: {
          not: "ARCHIVADA",
        },
      },
    }),

    prisma.variante.aggregate({
      where: {
        estado: {
          not: "ARCHIVADA",
        },
      },
      _sum: {
        stock: true,
      },
    }),

    prisma.movimientoInventario.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        variante: {
          include: {
            producto: true,
          },
        },
      },
    }),
  ]);

  const cards = [
    {
      titulo: "Colecciones",
      valor: totalColecciones,
      descripcion: "Colecciones activas u ocultas",
    },
    {
      titulo: "Productos",
      valor: totalProductos,
      descripcion: "Productos no archivados",
    },
    {
      titulo: "Agotados",
      valor: productosAgotados,
      descripcion: "Productos en SOLD OUT",
    },
    {
      titulo: "Variantes",
      valor: totalVariantes,
      descripcion: "Tallas y colores registrados",
    },
    {
      titulo: "Stock total",
      valor: stockTotal._sum.stock ?? 0,
      descripcion: "Piezas disponibles en inventario",
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Dashboard
          </h1>

          <p className="mt-3 text-neutral-400">
            Resumen general de tu tienda.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((card) => (
            <article
              key={card.titulo}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <p className="text-sm text-neutral-400">
                {card.titulo}
              </p>

              <p className="mt-3 text-4xl font-bold">
                {card.valor}
              </p>

              <p className="mt-2 text-sm text-neutral-500">
                {card.descripcion}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-xl font-semibold">
            Movimientos recientes
          </h2>

          {movimientosRecientes.length === 0 ? (
            <p className="mt-4 text-neutral-400">
              Todavía no hay movimientos de inventario.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {movimientosRecientes.map((movimiento: any) => (
                <article
                  key={movimiento.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">
                        {movimiento.variante.producto.nombre}
                      </p>

                      <p className="text-sm text-neutral-400">
                        Talla {movimiento.variante.talla} ·{" "}
                        {movimiento.variante.color || "Sin color"}
                      </p>

                      <p className="text-sm text-neutral-500">
                        {movimiento.nota || "Sin nota"}
                      </p>
                    </div>

                    <div className="text-sm text-neutral-300">
                      <p>Tipo: {movimiento.tipo}</p>
                      <p>
                        {movimiento.stockAnterior} →{" "}
                        {movimiento.stockNuevo}
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