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

  const soldOut = producto.estado === "AGOTADO" || stockTotal === 0;
  const nuevo = estilo.badges && esNuevo(producto.createdAt) && !soldOut;
  const destacado = estilo.badges && producto.destacado;

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
              ${Number(producto.precio).toFixed(2)}
            </p>

            {producto.descripcion && (
              <p className="leading-relaxed text-neutral-300">
                {producto.descripcion}
              </p>
            )}

            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                {estilo.emojis ? "📏 " : ""}Disponibilidad
              </h2>

              {producto.variantes.length === 0 ? (
                <p className="text-neutral-500">Sin tallas registradas.</p>
              ) : (
                <div className="grid gap-3">
                  {producto.variantes.map((variante) => (
                    <div
                      key={variante.id}
                      className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold">Talla {variante.talla}</p>
                        <p className="text-sm text-neutral-400">
                          {variante.color || "Sin color"}
                        </p>
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
