import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { configEstilo } from "@/lib/estilos-catalogo";
import { enlaceCatalogo } from "@/lib/dominios";
import BuscadorCatalogo from "@/components/BuscadorCatalogo";
import { normalizarModulos } from "@/lib/modulos";
import { descuentoProducto, aplicarDescuento } from "@/lib/promos";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TiendaPublicaPage({ params }: PageProps) {
  const { slug } = await params;

  const tienda = await prisma.tienda.findUnique({
    where: { slug },
    include: {
      colecciones: {
        where: { estado: "ACTIVA" },
        orderBy: { orden: "asc" },
        include: {
          productos: {
            include: {
              producto: {
                include: {
                  imagenes: {
                    orderBy: { orden: "asc" },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!tienda || !tienda.activa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Tienda no disponible</h1>
          <p className="mt-2 text-neutral-400">
            El catálogo que buscas no existe o no está disponible.
          </p>
        </div>
      </main>
    );
  }

  const colorTema = tienda.colorTema || "#ffffff";
  const estilo = configEstilo(tienda.estiloCatalogo);

  // Promociones vigentes de la tienda.
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

  // Todos los productos de la tienda, para el buscador.
  const productosTienda = await prisma.producto.findMany({
    where: { tiendaId: tienda.id, estado: { not: "ARCHIVADO" } },
    include: {
      imagenes: { orderBy: { orden: "asc" }, take: 1 },
      variantes: { where: { estado: { not: "ARCHIVADA" } } },
      colecciones: { select: { coleccionId: true } },
    },
    orderBy: { nombre: "asc" },
  });

  const productosBusqueda = productosTienda.map((p) => {
    const soldOut =
      p.estado === "AGOTADO" ||
      p.variantes.reduce((t, v) => t + v.stock, 0) === 0;

    const precios = p.variantes.map((v) => Number(v.precio ?? p.precio));
    const precioMin =
      precios.length === 0 ? Number(p.precio) : Math.min(...precios);
    const precioMax =
      precios.length === 0 ? Number(p.precio) : Math.max(...precios);

    const coleccionIds = p.colecciones.map((c) => c.coleccionId);
    const pct = descuentoProducto(promos, { marca: p.marca, coleccionIds });

    return {
      id: p.id,
      nombre: p.nombre,
      imagen: p.imagenes[0]?.url ?? null,
      soldOut,
      // Si hay promo vigente, el buscador muestra ya el precio rebajado.
      precioMin: aplicarDescuento(precioMin, pct),
      precioMax: aplicarDescuento(precioMax, pct),
      precioOriginalMin: precioMin,
      descuento: pct,
      marca: p.marca ?? "",
      coleccionIds,
    };
  });

  const mods = normalizarModulos(tienda.modulos);

  const colecciones = tienda.colecciones.map((coleccion) => {
    const productosActivos = coleccion.productos.filter(
      ({ producto }) => producto.estado !== "ARCHIVADO"
    );

    const portada =
      coleccion.imagenUrl ||
      productosActivos.find(({ producto }) => producto.imagenes[0])?.producto
        .imagenes[0]?.url ||
      null;

    return {
      id: coleccion.id,
      nombre: coleccion.nombre,
      descripcion: coleccion.descripcion,
      total: productosActivos.length,
      portada,
    };
  });

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {tienda.bannerUrl && (
        <section className="relative h-64 w-full overflow-hidden md:h-80">
          <img
            src={tienda.bannerUrl}
            alt={`Banner de ${tienda.nombre}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60" />
        </section>
      )}

      <section className="mx-auto max-w-6xl px-6 py-8">
        <header
          className={`animar-entrada mb-10 space-y-4 text-center ${
            tienda.bannerUrl ? "-mt-20 relative z-10" : ""
          }`}
        >
          {tienda.logoUrl && (
            <img
              src={tienda.logoUrl}
              alt={tienda.nombre}
              className="mx-auto h-28 w-28 rounded-full border-4 border-neutral-950 object-cover shadow-xl"
            />
          )}

          <div>
            <p
              className="text-sm uppercase tracking-[0.3em]"
              style={{ color: colorTema }}
            >
              Catálogo
            </p>

            <h1 className="mt-2 text-4xl font-bold">{tienda.nombre}</h1>

            {tienda.descripcion && (
              <p className="mx-auto mt-3 max-w-2xl text-neutral-300">
                {tienda.descripcion}
              </p>
            )}

            {tienda.instagram && (
              <p className="mt-2 text-sm text-neutral-400">
                {estilo.emojis ? "📸 " : ""}
                {tienda.instagram}
              </p>
            )}

            {tienda.direccion && (
              <p className="mx-auto mt-2 max-w-2xl text-sm text-neutral-500">
                {estilo.emojis ? "📍 " : ""}
                {tienda.direccion}
              </p>
            )}
          </div>

          {tienda.whatsapp && (
            <a
              href={`https://wa.me/${tienda.whatsapp}`}
              target="_blank"
              className="inline-flex rounded-xl px-5 py-3 font-semibold text-black transition hover:scale-105"
              style={{ backgroundColor: colorTema }}
            >
              {estilo.emojis ? "💬 " : ""}Contactar por WhatsApp
            </a>
          )}
        </header>

        <div className="mb-10">
          <BuscadorCatalogo
            productos={productosBusqueda}
            categorias={colecciones.map((c) => ({
              id: c.id,
              nombre: c.nombre,
            }))}
            slug={slug}
            colorTema={colorTema}
            emojis={estilo.emojis}
            iaActivo={mods.iaBusqueda}
          />
        </div>

        <section className="space-y-5">
          <h2 className="text-2xl font-bold">
            {estilo.emojis ? "🛍️ " : ""}Colecciones
          </h2>

          {colecciones.length === 0 ? (
            <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
              Todavía no hay colecciones disponibles.
            </p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {colecciones.map((coleccion, indice) => (
                <Link
                  key={coleccion.id}
                  href={enlaceCatalogo(slug, `/coleccion/${coleccion.id}`)}
                  style={{ animationDelay: `${indice * 70}ms` }}
                  className={`group animar-entrada block overflow-hidden ${estilo.tarjeta} ${estilo.cardHover}`}
                >
                  <div className="relative flex h-56 items-center justify-center overflow-hidden bg-neutral-800">
                    {coleccion.portada ? (
                      <img
                        src={coleccion.portada}
                        alt={coleccion.nombre}
                        className={`h-full w-full object-cover ${estilo.imagenHover}`}
                      />
                    ) : (
                      <span className="text-neutral-500">Sin imagen</span>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <h3 className="text-xl font-bold drop-shadow">
                        {coleccion.nombre}
                      </h3>
                      <p
                        className="text-sm font-semibold"
                        style={{ color: colorTema }}
                      >
                        {coleccion.total}{" "}
                        {coleccion.total === 1 ? "producto" : "productos"}
                      </p>
                    </div>
                  </div>

                  {coleccion.descripcion && (
                    <div className="p-4">
                      <p className="text-sm text-neutral-400">
                        {coleccion.descripcion}
                      </p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
