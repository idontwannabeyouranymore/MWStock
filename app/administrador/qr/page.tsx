"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { urlDeTienda } from "@/lib/dominios";

export default function QRPage() {
  const [slug, setSlug] = useState("");
  const [nombre, setNombre] = useState("");

  const contenedorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/tienda")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.slug) {
          setSlug(data.slug);
          setNombre(data.nombre || "");
        }
      })
      .catch((error) => console.error(error));
  }, []);

  const url = slug ? urlDeTienda(slug) : "";

  function descargarQR() {
    const canvas = contenedorRef.current?.querySelector("canvas");

    if (!canvas) {
      return;
    }

    const enlace = document.createElement("a");
    enlace.href = canvas.toDataURL("image/png");
    enlace.download = `qr-${slug || "tienda"}.png`;
    enlace.click();
  }

  async function copiarEnlace() {
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      alert("Enlace copiado");
    } catch {
      alert("No se pudo copiar el enlace");
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">Código QR</h1>

          <p className="mt-2 text-neutral-400">
            Imprime o comparte este QR para que tus clientes abran el catálogo
            público{nombre ? ` de ${nombre}` : ""}.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          {url ? (
            <>
              <div
                ref={contenedorRef}
                className="mx-auto w-fit rounded-2xl bg-white p-5"
              >
                <QRCodeCanvas
                  value={url}
                  size={256}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  marginSize={1}
                />
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <p className="text-sm text-neutral-400">Enlace del catálogo:</p>
                <p className="mt-1 break-all font-mono text-sm text-white">
                  {url}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={descargarQR}
                  className="rounded-xl bg-white px-5 py-3 font-semibold text-black"
                >
                  Descargar QR (PNG)
                </button>

                <button
                  onClick={copiarEnlace}
                  className="rounded-xl border border-neutral-700 px-5 py-3 font-semibold text-white"
                >
                  Copiar enlace
                </button>
              </div>

              <p className="text-xs text-neutral-500">
                Nota: en desarrollo el QR apunta a localhost. Cuando publiques la
                app (deploy), vuelve a generarlo aquí y apuntará a tu dominio
                real automáticamente.
              </p>
            </>
          ) : (
            <p className="text-neutral-400">Cargando datos de la tienda...</p>
          )}
        </div>
      </section>
    </main>
  );
}
