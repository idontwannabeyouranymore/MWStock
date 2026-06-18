import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";
import { redirect } from "next/navigation";
import ResumenHoy from "@/components/ResumenHoy";

export default async function DashboardPage() {
  const tienda = await obtenerTiendaDeSesion();

  if (!tienda) {
    redirect("/login");
  }

  const esPerfumes = tienda.tipo === "PERFUMES";

  const [
    totalProductos,
    totalSets,
    productosAgotados,
    totalPresentaciones,
    stockTotal,
    stockBajo,
  ] = await Promise.all([
    prisma.producto.count({
      where: { tiendaId: tienda.id, esSet: false, estado: { not: "ARCHIVADO" } },
    }),
    prisma.producto.count({
      where: { tiendaId: tienda.id, esSet: true, estado: { not: "ARCHIVADO" } },
    }),
    prisma.producto.count({
      where: { tiendaId: tienda.id, esSet: false, estado: "AGOTADO" },
    }),
    prisma.variante.count({
      where: {
        producto: { tiendaId: tienda.id },
        estado: { not: "ARCHIVADA" },
      },
    }),
    prisma.variante.aggregate({
      where: {
        producto: { tiendaId: tienda.id },
        estado: { not: "ARCHIVADA" },
      },
      _sum: { stock: true },
    }),
    prisma.variante.findMany({
      where: {
        producto: { tiendaId: tienda.id },
        estado: { not: "ARCHIVADA" },
        stock: { lte: 3 },
      },
      include: { producto: { select: { nombre: true } } },
      orderBy: { stock: "asc" },
      take: 20,
    }),
  ]);

  const cards = [
    {
      titulo: esPerfumes ? "Perfumes" : "Productos",
      valor: totalProductos,
    },
    ...(esPerfumes ? [{ titulo: "Sets", valor: totalSets }] : []),
    {
      titulo: "Agotados",
      valor: productosAgotados,
    },
    {
      titulo: esPerfumes ? "Presentaciones" : "Tallas",
      valor: totalPresentaciones,
    },
    {
      titulo: "Stock total",
      valor: stockTotal._sum.stock ?? 0,
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-4xl font-bold">Dashboard</h1>
          <p className="mt-3 text-neutral-400">Resumen de {tienda.nombre}.</p>
        </div>

        <ResumenHoy />

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.titulo}
              className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <p className="text-sm text-neutral-400">{card.titulo}</p>
              <p className="mt-3 text-4xl font-bold">{card.valor}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="text-xl font-semibold">
            Stock bajo (3 o menos)
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {esPerfumes ? "Presentaciones" : "Tallas"} por reabastecer.
          </p>

          {stockBajo.length === 0 ? (
            <p className="mt-4 text-neutral-400">
              Todo bien, no hay stock bajo.
            </p>
          ) : (
            <div className="mt-4 grid gap-2">
              {stockBajo.map((variante) => (
                <div
                  key={variante.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3"
                >
                  <p className="text-sm">
                    <span className="font-semibold">
                      {variante.producto.nombre}
                    </span>{" "}
                    <span className="text-neutral-400">{variante.talla}</span>
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      variante.stock === 0
                        ? "bg-red-900/50 text-red-400"
                        : "bg-yellow-900/50 text-yellow-300"
                    }`}
                  >
                    {variante.stock === 0
                      ? "Agotado"
                      : `${variante.stock} disponible(s)`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
