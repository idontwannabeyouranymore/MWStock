import { prisma } from "@/lib/prisma";
import { obtenerTiendaDeSesion } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ResumenHoy from "@/components/ResumenHoy";
import { normalizarModulos } from "@/lib/modulos";

function fechaCorta(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

export default async function DashboardPage() {
  const tienda = await obtenerTiendaDeSesion();

  if (!tienda) {
    redirect("/login");
  }

  const mods = normalizarModulos(tienda.modulos);

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

  // Pendientes de tandas activas: el periodo actual de cada una.
  const tandasActivas = mods.tandas
    ? await prisma.tanda.findMany({
    where: { tiendaId: tienda.id, estado: "ACTIVA" },
    include: {
      participantes: {
        include: { cliente: { select: { nombre: true } } },
      },
      periodos: {
        orderBy: { numero: "asc" },
        include: {
          pagos: {
            include: {
              participante: {
                include: { cliente: { select: { nombre: true } } },
              },
            },
          },
        },
      },
    },
      })
    : [];

  const tandasPendientes = tandasActivas
    .map((t) => {
      // Primer periodo que no esté entregado o con pagos pendientes.
      const periodo = t.periodos.find(
        (p) => !p.entregado || p.pagos.some((x) => !x.pagado)
      );
      if (!periodo) return null;
      const recibe =
        t.participantes.find((pa) => pa.turno === periodo.numero)?.cliente
          .nombre || "—";
      const faltanPagar = periodo.pagos
        .filter((x) => !x.pagado)
        .map((x) => x.participante.cliente.nombre);
      return {
        id: t.id,
        nombre: t.nombre,
        periodoNumero: periodo.numero,
        fecha: periodo.fecha,
        recibe,
        entregado: periodo.entregado,
        faltanPagar,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const cards = [
    {
      titulo: "Productos",
      valor: totalProductos,
    },
    ...(mods.sets ? [{ titulo: "Sets", valor: totalSets }] : []),
    {
      titulo: "Agotados",
      valor: productosAgotados,
    },
    {
      titulo: "Presentaciones",
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

        {tandasPendientes.length > 0 && (
          <section className="rounded-2xl border border-amber-800 bg-amber-950/20 p-5">
            <h2 className="text-xl font-semibold">Pendientes de tandas</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Lo que sigue en tus tandas activas.
            </p>
            <div className="mt-4 space-y-3">
              {tandasPendientes.map((t) => (
                <div
                  key={t.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {t.nombre}{" "}
                      <span className="font-normal text-neutral-500">
                        · Periodo {t.periodoNumero} · {fechaCorta(t.fecha)}
                      </span>
                    </p>
                    <Link
                      href={`/administrador/tandas/${t.id}`}
                      className="text-sm text-amber-400 hover:underline"
                    >
                      Abrir →
                    </Link>
                  </div>
                  <p className="mt-2 text-sm">
                    {t.entregado ? (
                      <span className="text-green-400">
                        ✓ Entregado a {t.recibe}
                      </span>
                    ) : (
                      <span>
                        Entregar a{" "}
                        <span className="font-semibold text-amber-400">
                          {t.recibe}
                        </span>
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-neutral-400">
                    {t.faltanPagar.length === 0
                      ? "Todos pagaron este periodo."
                      : `Faltan de pagar (${t.faltanPagar.length}): ${t.faltanPagar.join(
                          ", "
                        )}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

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
            Presentaciones por reabastecer.
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
