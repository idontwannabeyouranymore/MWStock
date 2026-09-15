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

type PageProps = { params: Promise<{ slug: string; id: string }> };

export default async function MayoreoColeccionPage({ params }: PageProps) {
  const { slug, id } = await params;

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

  const coleccion = await prisma.coleccion.findFirst({
    where: { id, tiendaId: tienda.id, estado: "ACTIVA" },
    include: {
      productos: {
        include: {
          producto: {
            include: {
              imagenes: { orderBy: { orden: "asc" }, take: 1 },
              variantes: { where: { estado: { not: "ARCHIVADA" } } },
              colecciones: { select: { coleccionId: true } },
            },
          },
        },
      },
    },
  });

  if (!mods.mayoreo || !coleccion) {
    return (
      <main className="min-h-screen" style={estilo.mainStyle}>
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-3xl font-bold">No disponible</h1>
          <Link
            href={enlaceCatalogo(slug, "/mayoreo")}
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Volver
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

  const productos = coleccion.productos
    .map(({ producto }) => producto)
    .filter(
      (p) =>
        p.estado !== "ARCHIVADO" &&
        enMayoreo(configs, {
          marca: p.marca,
          coleccionIds: p.colecciones.map((x) => x.coleccionId),
        })
    );

  return (
    <main className="min-h-screen" style={estilo.mainStyle}>
      <section className="mx-auto max-w-6xl px-6 py-8 pb-28">
        <Link
          href={enlaceCatalogo(slug, "/mayoreo")}
          className={`text-sm transition hover:opacity-80 ${estilo.textoTenue}`}
        >
          ← Volver a colecciones
        </Link>

        <header className="mt-6 mb-8">
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: colorTema }}
          >
            Mayoreo · Colección
          </p>
          <h1 className="mt-2 text-4xl font-bold">{coleccion.nombre}</h1>
        </header>

        {productos.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            Esta colección no tiene productos en mayoreo.
          </p>
        ) : (
          <div className={`grid gap-5 ${estilo.gridClass}`}>
            {productos.map((p, i) => {
              const stockTotal = p.variantes.reduce(
                (t, v) => t + v.stock,
                0
              );
              const soldOut = p.estado === "AGOTADO" || stockTotal === 0;
              const img = p.imagenes[0];
              return (
                <Link
                  key={p.id}
                  href={enlaceCatalogo(slug, `/mayoreo/producto/${p.id}`)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className={`group animar-entrada block overflow-hidden ${estilo.tarjeta} ${estilo.cardHover}`}
                >
                  <div className="relative flex h-56 items-center justify-center overflow-hidden bg-neutral-800">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img.url}
                        alt={p.nombre}
                        className={`h-full w-full object-cover ${estilo.imagenHover}`}
                      />
                    ) : (
                      <span className="text-neutral-500">Sin imagen</span>
                    )}
                    {soldOut && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                        <span className="rounded-full border border-white px-5 py-2 font-bold">
                          AGOTADO
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-5">
                    <h3 className="text-lg font-semibold">{p.nombre}</h3>
                    {p.marca ? (
                      <p className={`text-xs ${estilo.textoTenue}`}>
                        {p.marca}
                      </p>
                    ) : null}
                    <p className="font-bold" style={{ color: colorTema }}>
                      Mayoreo desde ${Number(p.precio).toFixed(2)}
                    </p>
                  </div>
                </Link>
              );
            })}
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
