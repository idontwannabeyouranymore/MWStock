"use client";

import { useEffect, useState } from "react";
import { urlDeTienda } from "@/lib/dominios";
import { ESTILOS } from "@/lib/estilos-catalogo";

type Tienda = {
  id: string;
  nombre: string;
  descripcion: string | null;
  whatsapp: string | null;
  instagram: string | null;
  direccion: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  colorTema: string | null;
  estiloCatalogo: string;
  tipo: string;
  slug: string;
};

export default function ConfiguracionPage() {
  const [tienda, setTienda] = useState<Tienda | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [direccion, setDireccion] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [colorTema, setColorTema] = useState("#ffffff");
  const [estiloCatalogo, setEstiloCatalogo] = useState("JUVENIL");

  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [subiendoBanner, setSubiendoBanner] = useState(false);
  const [cargando, setCargando] = useState(false);

  const [confirmReset, setConfirmReset] = useState("");
  const [borrando, setBorrando] = useState(false);

  async function obtenerTienda() {
    const response = await fetch("/api/tienda");
    const data = await response.json();

    setTienda(data);
    setNombre(data.nombre || "");
    setDescripcion(data.descripcion || "");
    setWhatsapp(data.whatsapp || "");
    setInstagram(data.instagram || "");
    setDireccion(data.direccion || "");
    setLogoUrl(data.logoUrl || "");
    setBannerUrl(data.bannerUrl || "");
    setColorTema(data.colorTema || "#ffffff");
    setEstiloCatalogo(data.estiloCatalogo || "JUVENIL");
  }

  async function subirImagen(archivo: File) {
    const formData = new FormData();
    formData.append("file", archivo);
    formData.append("productoId", "branding");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("No se pudo subir la imagen");
    }

    const data = await response.json();
    return data.url as string;
  }

  async function guardarConfiguracion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!nombre.trim()) {
      alert("El nombre de la tienda es obligatorio");
      return;
    }

    setCargando(true);

    const response = await fetch("/api/tienda", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nombre,
        descripcion,
        whatsapp,
        instagram,
        direccion,
        logoUrl,
        bannerUrl,
        colorTema,
        estiloCatalogo,
      }),
    });

    if (!response.ok) {
      alert("No se pudo guardar la configuración");
      setCargando(false);
      return;
    }

    const data = await response.json();
    setTienda(data);
    setCargando(false);
    alert("Configuración guardada");
  }

  async function borrarDatos() {
    if (confirmReset !== "BORRAR") return;
    if (
      !confirm(
        "Esto borra TODO el catálogo e historial de la tienda. ¿Continuar?"
      )
    ) {
      return;
    }
    setBorrando(true);
    try {
      const r = await fetch("/api/tienda/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacion: "BORRAR" }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error");
      setConfirmReset("");
      alert("Listo. Se borró el catálogo y el historial de la tienda.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBorrando(false);
    }
  }

  useEffect(() => {
    obtenerTienda();
  }, []);

  if (!tienda) {
    return (
      <main className="min-h-screen bg-neutral-950 p-8 text-white">
        Cargando configuración...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <section className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Configuración de tienda
          </h1>

          <p className="mt-2 text-neutral-400">
            Edita los datos visuales y de contacto que aparecen en el catálogo público.
          </p>
        </div>

        <form
          onSubmit={guardarConfiguracion}
          className="space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
        >
          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Nombre de la tienda
            </label>

            <input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
              placeholder="Ej. Urban Street"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Descripción
            </label>

            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
              placeholder="Ej. Ropa urbana, sneakers y accesorios."
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <label className="text-sm text-neutral-300">Logo</label>

              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-28 w-28 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-neutral-800 text-sm text-neutral-500">
                  Sin logo
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const archivo = event.target.files?.[0];

                  if (!archivo) {
                    return;
                  }

                  try {
                    setSubiendoLogo(true);
                    const url = await subirImagen(archivo);
                    setLogoUrl(url);
                  } catch (error) {
                    console.error(error);
                    alert("Error al subir logo");
                  } finally {
                    setSubiendoLogo(false);
                  }
                }}
                className="w-full text-sm text-neutral-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black"
              />

              {subiendoLogo && (
                <p className="text-sm text-neutral-400">Subiendo logo...</p>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
              <label className="text-sm text-neutral-300">
                Color principal
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={colorTema}
                  onChange={(event) => setColorTema(event.target.value)}
                  className="h-12 w-16 rounded-lg border border-neutral-700 bg-neutral-950"
                />

                <input
                  value={colorTema}
                  onChange={(event) => setColorTema(event.target.value)}
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-white outline-none focus:border-white"
                />
              </div>

              <div
                className="rounded-xl px-4 py-3 text-center font-semibold text-black"
                style={{ backgroundColor: colorTema }}
              >
                Vista previa del color
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">
              Estilo del catálogo
            </label>

            <select
              value={estiloCatalogo}
              onChange={(event) => setEstiloCatalogo(event.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
            >
              {ESTILOS.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.nombre}
                </option>
              ))}
            </select>

            <p className="text-xs text-neutral-500">
              {ESTILOS.find((o) => o.valor === estiloCatalogo)?.descripcion}
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <label className="text-sm text-neutral-300">
              Banner principal
            </label>

            {bannerUrl ? (
              <img
                src={bannerUrl}
                alt="Banner"
                className="h-48 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded-xl bg-neutral-800 text-sm text-neutral-500">
                Sin banner
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={async (event) => {
                const archivo = event.target.files?.[0];

                if (!archivo) {
                  return;
                }

                try {
                  setSubiendoBanner(true);
                  const url = await subirImagen(archivo);
                  setBannerUrl(url);
                } catch (error) {
                  console.error(error);
                  alert("Error al subir banner");
                } finally {
                  setSubiendoBanner(false);
                }
              }}
              className="w-full text-sm text-neutral-300 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black"
            />

            {subiendoBanner && (
              <p className="text-sm text-neutral-400">Subiendo banner...</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">WhatsApp</label>

            <input
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
              placeholder="Ej. 5213312345678"
            />

            <p className="text-xs text-neutral-500">
              Escríbelo con código de país, sin espacios ni signos.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Instagram</label>

            <input
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
              placeholder="Ej. @ventass_ab"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-neutral-300">Dirección</label>

            <textarea
              value={direccion}
              onChange={(event) => setDireccion(event.target.value)}
              className="min-h-20 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-white"
              placeholder="Dirección de la tienda física"
            />
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="text-sm text-neutral-400">Link público actual:</p>

            <p className="mt-1 break-all font-mono text-sm text-white">
              {urlDeTienda(tienda.slug)}
            </p>
          </div>

          <button
            disabled={cargando || subiendoLogo || subiendoBanner}
            className="rounded-xl bg-white px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar configuración"}
          </button>
        </form>

        {/* Zona de peligro */}
        <div className="space-y-3 rounded-2xl border border-red-900 bg-red-950/20 p-5">
          <h2 className="text-lg font-semibold text-red-400">
            Zona de peligro
          </h2>
          <p className="text-sm text-neutral-400">
            Borra TODO el catálogo e historial de esta tienda: productos,
            presentaciones, colecciones, sets, ventas, corte, clientes, deudas
            y tandas. Conserva tu cuenta y esta configuración. Úsalo para
            limpiar los datos de prueba. No se puede deshacer.
          </p>
          <p className="text-sm text-neutral-300">
            Escribe <span className="font-bold">BORRAR</span> para confirmar:
          </p>
          <input
            value={confirmReset}
            onChange={(e) => setConfirmReset(e.target.value)}
            placeholder="BORRAR"
            className="w-full rounded-xl border border-red-900 bg-neutral-950 px-4 py-3 text-white outline-none focus:border-red-500"
          />
          <button
            onClick={borrarDatos}
            disabled={confirmReset !== "BORRAR" || borrando}
            className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {borrando ? "Borrando..." : "Borrar todos los datos de la tienda"}
          </button>
        </div>
      </section>
    </main>
  );
}