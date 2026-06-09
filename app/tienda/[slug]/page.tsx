import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TiendaPublicaPage({ params }: PageProps) {
  const { slug } = await params;

  const tienda = await prisma.tienda.findUnique({
    where: {
      slug,
    },
    include: {
      colecciones: {
        where: {
          estado: "ACTIVA",
        },
        orderBy: {
          orden: "asc",
        },
        include: {
          productos: {
            include: {
              producto: {
                include: {
                  imagenes: {
                    orderBy: {
                      orden: "asc",
                    },
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
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tienda) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Tienda no encontrada</h1>
          <p className="mt-2 text-neutral-400">
            El catálogo que buscas no existe.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <header className="mb-10 space-y-4 text-center">
          {tienda.logoUrl && (
            <img
              src={tienda.logoUrl}
              alt={tienda.nombre}
              className="mx-auto h-24 w-24 rounded-full object-cover"
            />
          )}

          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
              Catálogo
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              {tienda.nombre}
            </h1>

            {tienda.descripcion && (
              <p className="mt-3 text-neutral-400">
                {tienda.descripcion}
              </p>
            )}
          </div>

          {tienda.whatsapp && (
            <a
              href={`https://wa.me/${tienda.whatsapp}`}
              target="_blank"
              className="inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black"
            >
              Contactar por WhatsApp
            </a>
          )}
        </header>

        <section className="space-y-12">
          {tienda.colecciones.length === 0 ? (
            <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
              Todavía no hay colecciones visibles.
            </p>
          ) : (
            tienda.colecciones.map((coleccion) => (
              <section key={coleccion.id} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold">
                    {coleccion.nombre}
                  </h2>

                  {coleccion.descripcion && (
                    <p className="mt-1 text-neutral-400">
                      {coleccion.descripcion}
                    </p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {coleccion.productos.map(({ producto }) => {
                    const variantesActivas = producto.variantes.filter(
                      (variante) => variante.estado !== "ARCHIVADA"
                    );

                    const stockTotal = variantesActivas.reduce(
                      (total, variante) => total + variante.stock,
                      0
                    );

                    const soldOut =
                      producto.estado === "AGOTADO" || stockTotal === 0;

                    const imagenPrincipal = producto.imagenes[0];

                    return (
                      <article
                        key={producto.id}
                        className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
                      >
                        <div className="relative flex h-64 items-center justify-center bg-neutral-800">
                          {imagenPrincipal ? (
                            <img
                              src={imagenPrincipal.url}
                              alt={producto.nombre}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-neutral-500">
                              Sin imagen
                            </span>
                          )}

                          {soldOut && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                              <span className="rounded-full border border-white px-5 py-2 text-lg font-bold">
                                SOLD OUT
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4 p-5">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {producto.nombre}
                            </h3>

                            {producto.marca && (
                              <p className="text-sm text-neutral-400">
                                {producto.marca}
                              </p>
                            )}

                            {producto.descripcion && (
                              <p className="mt-2 text-sm text-neutral-400">
                                {producto.descripcion}
                              </p>
                            )}
                          </div>

                          <p className="text-xl font-bold">
                            ${Number(producto.precio).toFixed(2)}
                          </p>

                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-neutral-300">
                              Disponibilidad
                            </p>

                            {variantesActivas.length === 0 ? (
                              <p className="text-sm text-neutral-500">
                                Sin variantes registradas
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {variantesActivas.map((variante) => (
                                  <span
                                    key={variante.id}
                                    className={`rounded-full px-3 py-1 text-xs ${
                                      variante.stock > 0
                                        ? "bg-white text-black"
                                        : "bg-neutral-800 text-neutral-500"
                                    }`}
                                  >
                                    {variante.talla}
                                    {variante.color
                                      ? ` · ${variante.color}`
                                      : ""}{" "}
                                    {variante.stock > 0
                                      ? `(${variante.stock})`
                                      : "(0)"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {tienda.whatsapp && (
                            <a
                              href={`https://wa.me/${tienda.whatsapp}?text=${encodeURIComponent(
                                `Hola, me interesa el producto ${producto.nombre}`
                              )}`}
                              target="_blank"
                              className="block rounded-xl bg-white px-4 py-3 text-center font-semibold text-black"
                            >
                              Preguntar por WhatsApp
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </section>
      </section>
    </main>
  );
}