import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { configEstilo, esNuevo } from "@/lib/estilos-catalogo";
import { enlaceCatalogo } from "@/lib/dominios";
import GaleriaProducto from "@/components/GaleriaProducto";
import { descuentoProducto, aplicarDescuento } from "@/lib/promos";

type PageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function ProductoPublicoPage({ params }: PageProps) {
  const { slug, id } = await params;

  const tienda = await prisma.tienda.findUnique({
    where: { slug },
  });

  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      imagenes: {
        orderBy: { orden: "asc" },
      },
      variantes: {
        where: {
          estado: {
            not: "ARCHIVADA",
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      colecciones: {
        include: {
          coleccion: true,
        },
      },
    },
  });

  if (!tienda || !tienda.activa || !producto || producto.tiendaId !== tienda.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <section className="text-center">
          <h1 className="text-3xl font-bold">Producto no encontrado</h1>
          <p className="mt-2 text-neutral-400">
            El producto que buscas no existe o ya no está disponible.
          </p>

          <Link
            href={enlaceCatalogo(slug)}
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Volver al catálogo
          </Link>
        </section>
      </main>
    );
  }

  const colorTema = tienda.colorTema || "#ffffff";
  const estilo = configEstilo(tienda.estiloCatalogo);

  // Promociones vigentes de la tienda y descuento aplicable a este producto.
  const ahora = new Date();
  const promos = await prisma.promocion.findMany({
    where: {
      tiendaId: tienda.id,
      activa: true,
      inicio: { lte: ahora },
      fin: { gte: ahora },
    },
    select: { porcentaje: true, alcance: true, coleccionId: true, marca: true },
  });
  const coleccionIds = producto.colecciones.map((pc) => pc.coleccionId);
  const pct = descuentoProducto(promos, {
    marca: producto.marca,
    coleccionIds,
  });

  const stockTotal = producto.variantes.reduce(
    (total, variante) => total + variante.stock,
    0
  );

  const soldOut = producto.estado === "AGOTADO" || stockTotal === 0;

  const nuevo = estilo.badges && esNuevo(producto.createdAt) && !soldOut;
  const destacado = estilo.badges && producto.destacado;

  const preciosPres = producto.variantes.map((v) =>
    Number(v.precio ?? producto.precio)
  );
  const precioMin =
    preciosPres.length === 0
      ? Number(producto.precio)
      : Math.min(...preciosPres);
  const precioMax =
    preciosPres.length === 0
      ? Number(producto.precio)
      : Math.max(...preciosPres);

  const mensajeWhatsApp = encodeURIComponent(
    `Hola, me interesa el producto ${producto.nombre}`
  );

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-5xl px-6 py-8">
        <Link
          href={enlaceCatalogo(slug)}
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← Volver al catálogo
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="animar-entrada">
            <GaleriaProducto
              imagenes={producto.imagenes}
              nombre={producto.nombre}
              soldOut={soldOut}
              destacado={destacado}
              nuevo={nuevo}
              emojis={estilo.emojis}
              colorTema={colorTema}
            />
          </div>

          <div className="animar-entrada space-y-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
                {tienda.nombre}
              </p>

              <h1 className="mt-3 text-4xl font-bold">{producto.nombre}</h1>

              {producto.marca && (
                <p className="mt-2 text-neutral-400">{producto.marca}</p>
              )}
            </div>

            {pct > 0 ? (
              <p className="flex flex-wrap items-center gap-3 text-3xl font-bold">
                <span className="text-xl font-semibold text-neutral-400 line-through opacity-60">
                  {precioMin === precioMax
                    ? `$${precioMin.toFixed(2)}`
                    : `desde $${precioMin.toFixed(2)}`}
                </span>
                <span style={{ color: colorTema }}>
                  {precioMin === precioMax
                    ? `$${aplicarDescuento(precioMin, pct).toFixed(2)}`
                    : `desde $${aplicarDescuento(precioMin, pct).toFixed(2)}`}
                </span>
                <span className="rounded-full bg-green-600 px-2 py-0.5 text-sm font-bold text-white">
                  -{pct}%
                </span>
              </p>
            ) : (
              <p className="text-3xl font-bold" style={{ color: colorTema }}>
                {precioMin === precioMax
                  ? `$${precioMin.toFixed(2)}`
                  : `desde $${precioMin.toFixed(2)}`}
              </p>
            )}

            {producto.descripcion && (
              <p className="leading-relaxed text-neutral-300">
                {producto.descripcion}
              </p>
            )}

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                {estilo.emojis ? "📏 " : ""}
                Presentaciones
              </h2>

              {producto.variantes.length === 0 ? (
                <p className="text-neutral-500">Sin presentaciones.</p>
              ) : (
                <div className="grid gap-3">
                  {producto.variantes.map((variante) => (
                    <div
                      key={variante.id}
                      className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold">{variante.talla}</p>
                        {(() => {
                          const base = Number(
                            variante.precio ?? producto.precio
                          );
                          return pct > 0 ? (
                            <p className="flex items-center gap-2 text-sm font-semibold">
                              <span className="text-neutral-400 line-through opacity-60">
                                ${base.toFixed(2)}
                              </span>
                              <span style={{ color: colorTema }}>
                                ${aplicarDescuento(base, pct).toFixed(2)}
                              </span>
                            </p>
                          ) : (
                            <p
                              className="text-sm font-semibold"
                              style={{ color: colorTema }}
                            >
                              ${base.toFixed(2)}
                            </p>
                          );
                        })()}
                      </div>

                      <span
                        className={
                          variante.stock > 0
                            ? "text-sm font-semibold text-white"
                            : "text-sm font-semibold text-neutral-500"
                        }
                      >
                        {variante.stock > 0 ? "Disponible" : "Agotado"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {tienda.whatsapp && (
                <a
                  href={`https://wa.me/${tienda.whatsapp}?text=${mensajeWhatsApp}`}
                  target="_blank"
                  className="block rounded-xl px-5 py-4 text-center font-semibold text-black transition hover:scale-[1.02]"
                  style={{ backgroundColor: colorTema }}
                >
                  {estilo.emojis ? "💬 " : ""}Preguntar por WhatsApp
                </a>
              )}

              <p className="text-center text-sm text-neutral-500">
                Consulta disponibilidad antes de visitar la tienda.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
