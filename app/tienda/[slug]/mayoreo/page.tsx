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
  nivelesDeProducto,
  normalizarNiveles,
  type MayoreoConfig,
} from "@/lib/mayoreo";
import CarritoMayoreo from "@/components/CarritoMayoreo";

type PageProps = { params: Promise<{ slug: string }> };

export default async function MayoreoPublicoPage({ params }: PageProps) {
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
          <p className={`mt-2 ${estilo.textoTenue}`}>
            Esta tienda no tiene catálogo de mayoreo por ahora.
          </p>
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

  const productos = await prisma.producto.findMany({
    where: { tiendaId: tienda.id, estado: { not: "ARCHIVADO" } },
    include: {
      imagenes: { orderBy: { orden: "asc" }, take: 1 },
      colecciones: { select: { coleccionId: true } },
    },
    orderBy: { nombre: "asc" },
  });

  const productosMayoreo = productos
    .map((p) => {
      const coleccionIds = p.colecciones.map((c) => c.coleccionId);
      const niveles = nivelesDeProducto(configs, {
        marca: p.marca,
        coleccionIds,
      });
      return { p, niveles };
    })
    .filter((x) => x.niveles.length > 0)
    .map(({ p, niveles }) => ({
      id: p.id,
      nombre: p.nombre,
      marca: p.marca ?? "",
      imagen: p.imagenes[0]?.url ?? null,
      precioBase: Number(p.precio),
      niveles,
    }));

  return (
    <main className="min-h-screen" style={estilo.mainStyle}>
      <section className="mx-auto max-w-4xl px-6 py-8">
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
            {estilo.titulo || tienda.nombre}
          </h1>
          <p className={`mt-3 max-w-2xl ${estilo.textoTenue}`}>
            Precios especiales por cantidad. Elige cuántas piezas quieres de cada
            producto, arma tu pedido y envíalo por WhatsApp.
          </p>
        </header>

        {productosMayoreo.length === 0 ? (
          <p className="rounded-2xl border border-neutral-800 p-6 text-center text-neutral-400">
            Todavía no hay productos en mayoreo.
          </p>
        ) : (
          <CarritoMayoreo
            productos={productosMayoreo}
            tiendaNombre={tienda.nombre}
            whatsapp={tienda.whatsapp}
            colorTema={colorTema}
            tarjeta={estilo.tarjeta}
            textoTenue={estilo.textoTenue}
          />
        )}
      </section>
    </main>
  );
}
