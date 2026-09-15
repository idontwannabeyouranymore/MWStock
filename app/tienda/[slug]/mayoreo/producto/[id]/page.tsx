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
import GaleriaProducto from "@/components/GaleriaProducto";
import AgregarMayoreo from "@/components/AgregarMayoreo";
import BarraCarritoMayoreo from "@/components/BarraCarritoMayoreo";

type PageProps = { params: Promise<{ slug: string; id: string }> };

export default async function MayoreoProductoPage({ params }: PageProps) {
  const { slug, id } = await params;

  const tienda = await prisma.tienda.findUnique({ where: { slug } });
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      imagenes: { orderBy: { orden: "asc" } },
      variantes: {
        where: { estado: { not: "ARCHIVADA" } },
        orderBy: { createdAt: "asc" },
      },
      colecciones: { select: { coleccionId: true } },
    },
  });

  if (
    !tienda ||
    !tienda.activa ||
    !producto ||
    producto.tiendaId !== tienda.id
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white">
        <h1 className="text-3xl font-bold">Producto no encontrado</h1>
      </main>
    );
  }

  const colorTema = tienda.colorTema || "#ffffff";
  const estilo = temaCatalogo(
    normalizarPersonalizacion(tienda.personalizacion),
    configEstilo(tienda.estiloCatalogo)
  );
  const mods = normalizarModulos(tienda.modulos);

  const mayoreosRaw = await prisma.mayoreo.findMany({
    where: { tiendaId: tienda.id, activo: true },
  });
  const configs: MayoreoConfig[] = mayoreosRaw.map((m) => ({
    alcance: m.alcance,
    coleccionId: m.coleccionId,
    marca: m.marca,
    niveles: normalizarNiveles(m.niveles),
  }));
  const niveles = nivelesDeProducto(configs, {
    marca: producto.marca,
    coleccionIds: producto.colecciones.map((x) => x.coleccionId),
  });

  if (!mods.mayoreo || niveles.length === 0) {
    return (
      <main className="min-h-screen" style={estilo.mainStyle}>
        <section className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h1 className="text-3xl font-bold">Este producto no está en mayoreo</h1>
          <Link
            href={enlaceCatalogo(slug, "/mayoreo")}
            className="mt-6 inline-flex rounded-xl bg-white px-5 py-3 font-semibold text-black"
          >
            Volver al mayoreo
          </Link>
        </section>
      </main>
    );
  }

  const stockTotal = producto.variantes.reduce((t, v) => t + v.stock, 0);
  const soldOut = producto.estado === "AGOTADO" || stockTotal === 0;

  const variantes = producto.variantes.map((v) => ({
    id: v.id,
    talla: v.talla,
    stock: v.stock,
    precio: Number(v.precio ?? producto.precio),
  }));

  return (
    <main className="min-h-screen" style={estilo.mainStyle}>
      <section className="mx-auto max-w-5xl px-6 py-8 pb-28">
        <Link
          href={enlaceCatalogo(slug, "/mayoreo")}
          className={`text-sm transition hover:opacity-80 ${estilo.textoTenue}`}
        >
          ← Volver al mayoreo
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="animar-entrada">
            <GaleriaProducto
              imagenes={producto.imagenes}
              nombre={producto.nombre}
              soldOut={soldOut}
              destacado={false}
              nuevo={false}
              emojis={estilo.emojis}
              colorTema={colorTema}
            />
          </div>

          <div className="animar-entrada space-y-6">
            <div>
              <p
                className="text-sm uppercase tracking-[0.3em]"
                style={{ color: colorTema }}
              >
                Mayoreo
              </p>
              <h1 className="mt-3 text-4xl font-bold">{producto.nombre}</h1>
              {producto.marca && (
                <p className={`mt-2 ${estilo.textoTenue}`}>{producto.marca}</p>
              )}
            </div>

            {producto.descripcion && (
              <p className={`leading-relaxed ${estilo.textoTenue}`}>
                {producto.descripcion}
              </p>
            )}

            <AgregarMayoreo
              slug={slug}
              productoId={producto.id}
              nombre={producto.nombre}
              imagen={producto.imagenes[0]?.url ?? null}
              variantes={variantes}
              niveles={niveles}
              colorTema={colorTema}
            />
          </div>
        </div>
      </section>

      <BarraCarritoMayoreo
        slug={slug}
        hrefCarrito={enlaceCatalogo(slug, "/mayoreo/carrito")}
        colorTema={colorTema}
      />
    </main>
  );
}
