import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { enlaceCatalogo } from "@/lib/dominios";
import { configEstilo } from "@/lib/estilos-catalogo";
import {
  normalizarPersonalizacion,
  temaCatalogo,
} from "@/lib/personalizacion";
import CarritoMayoreoContenido from "@/components/CarritoMayoreoContenido";

type PageProps = { params: Promise<{ slug: string }> };

export default async function MayoreoCarritoPage({ params }: PageProps) {
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

  return (
    <main className="min-h-screen" style={estilo.mainStyle}>
      <section className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href={enlaceCatalogo(slug, "/mayoreo")}
          className={`text-sm transition hover:opacity-80 ${estilo.textoTenue}`}
        >
          ← Seguir comprando
        </Link>

        <header className="mt-6 mb-6">
          <p
            className="text-sm uppercase tracking-[0.3em]"
            style={{ color: colorTema }}
          >
            Mayoreo
          </p>
          <h1 className="mt-2 text-4xl font-bold">Tu pedido</h1>
        </header>

        <CarritoMayoreoContenido
          slug={slug}
          tiendaNombre={tienda.nombre}
          whatsapp={tienda.whatsapp}
          colorTema={colorTema}
          hrefSeguir={enlaceCatalogo(slug, "/mayoreo")}
        />
      </section>
    </main>
  );
}
