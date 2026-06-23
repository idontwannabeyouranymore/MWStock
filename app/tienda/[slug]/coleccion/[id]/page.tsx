import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { configEstilo, esNuevo } from "@/lib/estilos-catalogo";
import { enlaceCatalogo } from "@/lib/dominios";
import { normalizarModulos } from "@/lib/modulos";

type PageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
  searchParams: Promise<{ marca?: string }>;
};

type VariantePublica = {
  id: string;
  talla: string;
  color: string | null;
  stock: number;
  estado: string;
};

export default async function ColeccionPublicaPage({
  params,
  searchParams,
}: PageProps) {
  const { slug, id } = await params;
  const { marca: marcaParamRaw } = await searchParams;
  const marcaActiva = marcaParamRaw
    ? decodeURIComponent(marcaParamRaw)
    : null;

  const tienda = await prisma.tienda.findUnique({
    where: { slug },
  });

  if (!tienda || !tienda.activa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Tienda no disponible</h1>
        </div>
      </main>
    );
  }

  const coleccion = await prisma.coleccion.findFirst({
    where: {
      id,
      tiendaId: tienda.id,
      estado: "ACTIVA",
    },
    include: {
      productos: {
        include: {
          producto: {
            include: {
              imagenes: { orderBy: { orden: "asc" } },
              variantes: {
                where: { estado: { not: "ARCHIVADA" } },
                orderBy: { createdAt: "asc" },
              },
              componentes: {
                include: { variante: { include: { producto: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!coleccion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <section className="text-center">
          <h1 className="text-3xl font-bold">Colección no encontrada</h1>
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

  const productos = coleccion.productos
    .map(({ producto }) => producto)
    .filter((producto) => producto.estado !== "ARCHIVADO");

  // El nivel de marcas solo aplica si el dueño habilitó esa herramienta.
  const mods = normalizarModulos(tienda.modulos);
  const marcaActivaVista = mods.marcas ? marcaActiva : null;

  // Marcas presentes en la colección (con imagen de muestra y conteo).
  const marcasMap = new Map<
    string,
    { nombre: string; total: number; imagen: string | null }
  >();
  for (const p of productos) {
    const m = (p.marca || "").trim() || "Otros";
    const cur = marcasMap.get(m) || { nombre: m, total: 0, imagen: null };
    cur.total += 1;
    if (!cur.imagen && p.imagenes[0]) cur.imagen = p.imagenes[0].url;
    marcasMap.set(m, cur);
  }
  const marcas = [...marcasMap.values()].sort((a, b) => b.total - a.total);

  // Si está habilitado, hay varias marcas y no se eligió una, mostramos el paso.
  const mostrarMarcas =
    mods.marcas && !marcaActivaVista && marcas.length > 1;
  const productosFiltrados = marcaActivaVista
    ? productos.filter(
        (p) => ((p.marca || "").trim() || "Otros") === marcaActivaVista
      )
    : productos;

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href={
            marcaActivaVista
              ? enlaceCatalogo(slug, `/coleccion/${id}`)
              : enlaceCatalogo(slug)
          }
          className="text-sm text-neutral-400 transition hover:text-white"
        >
          ← {marcaActivaVista ? "Volver a marcas" : "Volver a colecciones"}
        </Link>

        <header className="animar-entrada mt-6 mb-10">
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: colorTema }}
          >
            {marcaActivaVista ? coleccion.nombre : "Colección"}
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            {estilo.emojis ? "✨ " : ""}
            {marcaActivaVista ?? coleccion.nombre}
          </h1>
          {coleccion.descripcion && (
            <p className="mt-3 max-w-2xl text-neutral-300">
              {coleccion.descripcion}
            </p>
          )}
        </header>

        {mostrarMarcas ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {marcas.map((m, indice) => (
              <Link
                key={m.nombre}
                href={enlaceCatalogo(
                  slug,
                  `/coleccion/${id}?marca=${encodeURIComponent(m.nombre)}`
                )}
                style={{ animationDelay: `${indice * 60}ms` }}
                className={`group animar-entrada block overflow-hidden ${estilo.tarjeta} ${estilo.cardHover}`}
              >
                <div className="relative flex h-48 items-center justify-center overflow-hidden bg-neutral-800">
                  {m.imagen ? (
                    <img
                      src={m.imagen}
                      alt={m.nombre}
                      className={`h-full w-full object-cover ${estilo.imagenHover}`}
                    />
                  ) : (
                    <span className="text-neutral-500">Sin imagen</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-xl font-bold drop-shadow">{m.nombre}</h3>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: colorTema }}
                    >
                      {m.total} {m.total === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : productosFiltrados.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            Esta colección todavía no tiene productos.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {productosFiltrados.map((producto, indice) => {
              const esSetProd = producto.esSet;
              const variantesActivas = producto.variantes as VariantePublica[];

              const stockTotal = variantesActivas.reduce(
                (total, variante) => total + variante.stock,
                0
              );

              const soldOut = esSetProd
                ? producto.componentes.length === 0 ||
                  producto.componentes.some(
                    (c) => c.variante.stock < c.cantidad
                  )
                : producto.estado === "AGOTADO" || stockTotal === 0;

              const imagenPrincipal = producto.imagenes[0];
              const nuevo = estilo.badges && esNuevo(producto.createdAt);
              const destacado = estilo.badges && producto.destacado;

              const precios = producto.variantes.map((v) =>
                Number(v.precio ?? producto.precio)
              );
              const precioMin =
                esSetProd || precios.length === 0
                  ? Number(producto.precio)
                  : Math.min(...precios);
              const precioMax =
                esSetProd || precios.length === 0
                  ? Number(producto.precio)
                  : Math.max(...precios);

              return (
                <article
                  key={producto.id}
                  style={{ animationDelay: `${indice * 70}ms` }}
                  className={`group animar-entrada overflow-hidden ${estilo.tarjeta} ${estilo.cardHover}`}
                >
                  <Link
                    href={enlaceCatalogo(slug, `/producto/${producto.id}`)}
                    className="block"
                  >
                    <div className="relative flex h-64 items-center justify-center overflow-hidden bg-neutral-800">
                      {imagenPrincipal ? (
                        <img
                          src={imagenPrincipal.url}
                          alt={producto.nombre}
                          className={`h-full w-full object-cover ${estilo.imagenHover}`}
                        />
                      ) : (
                        <span className="text-neutral-500">Sin imagen</span>
                      )}

                      <div className="absolute left-3 top-3 flex flex-col gap-2">
                        {esSetProd && (
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-black shadow">
                            {estilo.emojis ? "🎁 " : ""}Set
                          </span>
                        )}
                        {destacado && (
                          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black shadow">
                            {estilo.emojis ? "⭐ " : ""}Destacado
                          </span>
                        )}
                        {nuevo && !soldOut && (
                          <span
                            className="rounded-full px-3 py-1 text-xs font-bold text-black shadow"
                            style={{ backgroundColor: colorTema }}
                          >
                            {estilo.emojis ? "🔥 " : ""}Nuevo
                          </span>
                        )}
                      </div>

                      {soldOut && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                          <span className="animar-pop rounded-full border border-white px-5 py-2 text-lg font-bold">
                            SOLD OUT
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-5">
                      <h3 className="text-lg font-semibold">
                        {producto.nombre}
                      </h3>

                      <p
                        className="text-xl font-bold"
                        style={{ color: colorTema }}
                      >
                        {precioMin === precioMax
                          ? `$${precioMin.toFixed(2)}`
                          : `desde $${precioMin.toFixed(2)}`}
                      </p>

                      <div className="space-y-2">
                        {esSetProd ? (
                          <>
                            <p className="text-sm font-semibold text-neutral-300">
                              Incluye
                            </p>
                            <p className="text-sm text-neutral-400">
                              {producto.componentes.length} decants en el
                              paquete
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-neutral-300">
                              Presentaciones
                            </p>
                            {variantesActivas.length === 0 ? (
                              <p className="text-sm text-neutral-500">
                                Sin presentaciones
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {variantesActivas.map((variante) => (
                                  <span
                                    key={variante.id}
                                    className="rounded-full px-3 py-1 text-xs font-semibold transition"
                                    style={{
                                      backgroundColor:
                                        variante.stock > 0
                                          ? colorTema
                                          : "#262626",
                                      color:
                                        variante.stock > 0
                                          ? "#000000"
                                          : "#737373",
                                    }}
                                  >
                                    {variante.talla}{" "}
                                    {variante.stock > 0
                                      ? `(${variante.stock})`
                                      : "(0)"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </Link>

                  {tienda.whatsapp && (
                    <div className="px-5 pb-5">
                      <a
                        href={`https://wa.me/${tienda.whatsapp}?text=${encodeURIComponent(
                          `Hola, me interesa ${producto.nombre}`
                        )}`}
                        target="_blank"
                        className="block rounded-xl px-4 py-3 text-center font-semibold text-black transition hover:scale-[1.02]"
                        style={{ backgroundColor: colorTema }}
                      >
                        {estilo.emojis ? "💬 " : ""}Preguntar por WhatsApp
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
