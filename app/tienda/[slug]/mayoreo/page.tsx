import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { enlaceCatalogo } from "@/lib/dominios";
import { normalizarModulos } from "@/lib/modulos";
import { configEstilo } from "@/lib/estilos-catalogo";
import {
  normalizarPersonalizacion,
  temaCatalogo,
} from "@/lib/personalizacion";
import {
  enMayoreo,
  normalizarNiveles,
  type MayoreoConfig,
} from "@/lib/mayoreo";
import BarraCarritoMayoreo from "@/components/BarraCarritoMayoreo";

type PageProps = { params: Promise<{ slug: string }> };

export default async function MayoreoHomePage({ params }: PageProps) {
  const { slug } = await params;

  const tienda = await prisma.tienda.findUnique({ where: { slug } });
  if (!tienda || !tienda.activa) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <h1 className="text-3xl font-bold">Tienda no disponible</h1>
      </main>
    );
  }

  const colorTema = tienda.colorTema || "#ffffff";
  const estilo = temaCatalogo(
    normalizarPersonalizacion(tienda.personalizacion),
    configEstilo(tienda.estiloCatalogo)
  );
  const mods = normalizarModulos(tienda.modulos);

  if (!mods.mayoreo) {
    return (
      <main className="min-h-screen" style={estilo.mainStyle}>
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-3xl font-bold">Mayoreo no disponible</h1>
          <Link
            href={enlaceCatalogo(slug)}
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Ver catálogo
          </Link>
        </section>
      </main>
    );
  }

  const mayoreosRaw = await prisma.mayoreo.findMany({
    where: { tiendaId: tienda.id, activo: true },
  });
  const configs: MayoreoConfig[] = mayoreosRaw.map((m) => ({
    alcance: m.alcance,
    coleccionId: m.coleccionId,
    marca: m.marca,
    niveles: normalizarNiveles(m.niveles),
  }));

  const coleccionesRaw = await prisma.coleccion.findMany({
    where: { tiendaId: tienda.id, estado: "ACTIVA" },
    orderBy: { orden: "asc" },
    include: {
      productos: {
        include: {
          producto: {
            include: {
              imagenes: { orderBy: { orden: "asc" }, take: 1 },
              colecciones: { select: { coleccionId: true } },
            },
          },
        },
      },
    },
  });

  const colecciones = coleccionesRaw
    .map((c) => {
      const prodsMayoreo = c.productos
        .map(({ producto }) => producto)
        .filter(
          (p) =>
            p.estado !== "ARCHIVADO" &&
            enMayoreo(configs, {
              marca: p.marca,
              coleccionIds: p.colecciones.map((x) => x.coleccionId),
            })
        );
      const portada =
        c.imagenUrl || prodsMayoreo.find((p) => p.imagenes[0])?.imagenes[0]?.url || null;
      return {
        id: c.id,
        nombre: c.nombre,
        total: prodsMayoreo.length,
        portada,
      };
    })
    .filter((c) => c.total > 0);

  return (
    <main className="min-h-screen" style={estilo.mainStyle}>
      <section className="mx-auto max-w-6xl px-6 py-8 pb-28">
        <Link
          href={enlaceCatalogo(slug)}
          className={`text-sm transition hover:opacity-80 ${estilo.textoTenue}`}
        >
          ← Volver al catálogo
        </Link>

        <header className="mt-6 mb-8">
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: colorTema }}
          >
            Mayoreo
          </p>
          <h1 className="mt-2 text-4xl font-bold">
            {estilo.emojis ? "📦 " : ""}
            {estilo.titulo || tienda.nombre}
          </h1>
          <p className={`mt-3 max-w-2xl ${estilo.textoTenue}`}>
            Precios especiales por cantidad. Elige productos, tallas y cantidades
            y envía tu pedido por WhatsApp.
          </p>
        </header>

        {colecciones.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            Todavía no hay productos en mayoreo.
          </p>
        ) : (
          <div className={`grid gap-5 ${estilo.gridClass}`}>
            {colecciones.map((c, i) => (
              <Link
                key={c.id}
                href={enlaceCatalogo(slug, `/mayoreo/coleccion/${c.id}`)}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`group animar-entrada block overflow-hidden ${estilo.tarjeta} ${estilo.cardHover}`}
              >
                <div className="relative flex h-56 items-center justify-center overflow-hidden bg-neutral-800">
                  {c.portada ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.portada}
                      alt={c.nombre}
                      className={`h-full w-full object-cover ${estilo.imagenHover}`}
                    />
                  ) : (
                    <span className="text-neutral-500">Sin imagen</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-xl font-bold drop-shadow">{c.nombre}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <BarraCarritoMayoreo
        slug={slug}
        hrefCarrito={enlaceCatalogo(slug, "/mayoreo/carrito")}
        colorTema={colorTema}
      />
    </main>
  );
}
