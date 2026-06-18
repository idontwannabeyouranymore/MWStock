import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { configEstilo, esNuevo } from "@/lib/estilos-catalogo";
import { enlaceCatalogo } from "@/lib/dominios";
import GaleriaProducto from "@/components/GaleriaProducto";

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
      componentes: {
        include: { variante: { include: { producto: true } } },
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

  const stockTotal = producto.variantes.reduce(
    (total, variante) => total + variante.stock,
    0
  );

  const esSetProd = producto.esSet;

  const soldOut = esSetProd
    ? producto.componentes.length === 0 ||
      producto.componentes.some((c) => c.variante.stock < c.cantidad)
    : producto.estado === "AGOTADO" || stockTotal === 0;

  const nuevo = estilo.badges && esNuevo(producto.createdAt) && !soldOut;
  const destacado = estilo.badges && producto.destacado;

  const esPerfumes = tienda.tipo === "PERFUMES";
  const preciosPres = producto.variantes.map((v) =>
    Number(v.precio ?? producto.precio)
  );
  const precioMin =
    esSetProd || preciosPres.length === 0
      ? Number(producto.precio)
      : Math.min(...preciosPres);
  const precioMax =
    esSetProd || preciosPres.length === 0
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

            <p className="text-3xl font-bold" style={{ color: colorTema }}>
              {precioMin === precioMax
                ? `$${precioMin.toFixed(2)}`
                : `desde $${precioMin.toFixed(2)}`}
            </p>

            {producto.descripcion && (
              <p className="leading-relaxed text-neutral-300">
                {producto.descripcion}
              </p>
            )}

            <div className="space-y-3">
              {esSetProd ? (
                <>
                  <h2 className="text-lg font-semibold">
                    {estilo.emojis ? "🎁 " : ""}Incluye
                  </h2>
                  {producto.componentes.length === 0 ? (
                    <p className="text-neutral-500">
                      Este set no tiene componentes.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {producto.componentes.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
                        >
                          <p className="font-semibold">
                            {c.variante.producto.nombre}{" "}
                            <span className="text-neutral-400">
                              ({c.variante.talla})
                            </span>
                          </p>
                          <span
                            className={
                              c.variante.stock >= c.cantidad
                                ? "text-sm font-semibold text-white"
                                : "text-sm font-semibold text-red-400"
                            }
                          >
                            {c.variante.stock >= c.cantidad
                              ? "Disponible"
                              : "Sin stock"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">
                    {estilo.emojis ? "📏 " : ""}
                    {esPerfumes ? "Presentaciones" : "Disponibilidad"}
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
                            <p className="font-semibold">
                              {esPerfumes
                                ? variante.talla
                                : `Talla ${variante.talla}`}
                            </p>
                            {esPerfumes ? (
                              <p
                                className="text-sm font-semibold"
                                style={{ color: colorTema }}
                              >
                                $
                                {Number(
                                  variante.precio ?? producto.precio
                                ).toFixed(2)}
                              </p>
                            ) : (
                              <p className="text-sm text-neutral-400">
                                {variante.color || "Sin color"}
                              </p>
                            )}
                          </div>

                          <span
                            className={
                              variante.stock > 0
                                ? "text-sm font-semibold text-white"
                                : "text-sm font-semibold text-neutral-500"
                            }
                          >
                            {variante.stock > 0
                              ? `${variante.stock} disponible(s)`
                              : "Agotado"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
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
