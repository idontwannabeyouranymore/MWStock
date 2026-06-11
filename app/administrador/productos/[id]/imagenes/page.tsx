"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Imagen = {
  id: string;
  url: string;
  orden: number;
};

export default function ImagenesProductoPage() {
  const params = useParams<{ id: string }>();
  const productoId = params.id;

  const [imagenes, setImagenes] = useState<Imagen[]>([]);
  const [nombreProducto, setNombreProducto] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const obtenerImagenes = useCallback(async () => {
    const response = await fetch(`/api/productos/${productoId}/imagenes`);
    const data = await response.json();
    setImagenes(data);
  }, [productoId]);

  const obtenerProducto = useCallback(async () => {
    const response = await fetch(`/api/productos/${productoId}`);

    if (response.ok) {
      const data = await response.json();
      setNombreProducto(data.nombre);
    }
  }, [productoId]);

  async function subirImagen(event: React.ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];

    if (!archivo) {
      return;
    }

    setSubiendo(true);

    try {
      const formData = new FormData();
      formData.append("file", archivo);
      formData.append("productoId", productoId);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("No se pudo subir la imagen");
      }

      const uploadData = await uploadResponse.json();

      const guardarResponse = await fetch(
        `/api/productos/${productoId}/imagenes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: uploadData.url,
          }),
        }
      );

      if (!guardarResponse.ok) {
        throw new Error("No se pudo guardar la imagen");
      }

      await obtenerImagenes();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al subir la imagen");
    } finally {
      setSubiendo(false);
      event.target.value = "";
    }
  }

  async function eliminarImagen(imagenId: string) {
    const confirmar = confirm("¿Eliminar esta imagen?");

    if (!confirmar) {
      return;
    }

    const response = await fetch(`/api/imagenes/${imagenId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      alert("No se pudo eliminar la imagen");
      return;
    }

    await obtenerImagenes();
  }

  useEffect(() => {
    obtenerImagenes();
    obtenerProducto();
  }, [obtenerImagenes, obtenerProducto]);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-4xl space-y-8">
        <div>
          <Link
            href="/administrador/productos"
            className="text-sm text-neutral-400 hover:text-white"
          >
            ← Volver a productos
          </Link>

          <h1 className="mt-3 text-3xl font-bold">
            Imágenes{nombreProducto ? `: ${nombreProducto}` : ""}
          </h1>

          <p className="mt-2 text-neutral-400">
            La primera imagen (la más antigua) es la principal del catálogo.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <label className="text-sm text-neutral-300">Agregar imagen</label>

          <input
            type="file"
            accept="image/*"
            disabled={subiendo}
            onChange={subirImagen}
            className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black disabled:opacity-50"
          />

          {subiendo && (
            <p className="mt-2 text-sm text-neutral-400">Subiendo imagen...</p>
          )}
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            Imágenes del producto ({imagenes.length})
          </h2>

          {imagenes.length === 0 ? (
            <p className="rounded-xl border border-neutral-800 p-4 text-neutral-400">
              Todavía no hay imágenes. Sube la primera arriba.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {imagenes.map((imagen, indice) => (
                <article
                  key={imagen.id}
                  className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900"
                >
                  <div className="relative flex h-56 items-center justify-center bg-neutral-800">
                    <img
                      src={imagen.url}
                      alt={`Imagen ${indice + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {indice === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                        Principal
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <button
                      onClick={() => eliminarImagen(imagen.id)}
                      className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
