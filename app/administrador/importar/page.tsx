"use client";

import { useEffect, useState } from "react";
import { normalizarModulos } from "@/lib/modulos";

type Fila = {
  categoria: string;
  marca: string;
  nombre: string;
  presentacion: string;
  precio: string;
  stock: string;
};

type Resultado = {
  creados: number;
  omitidos: number;
  colecciones: number;
  variantes: number;
  errores: string[];
};

const COLUMNAS = [
  "categoria",
  "marca",
  "nombre",
  "presentacion",
  "precio",
  "stock",
];

const PLANTILLA = `categoria,marca,nombre,presentacion,precio,stock
Decants Diseñador,Louis Vuitton,Afternoon Swim,10ml,850,10
Decants Diseñador,Louis Vuitton,Afternoon Swim,5ml,480,10
Decants Diseñador,Louis Vuitton,Afternoon Swim,3ml,330,10
Decants Diseñador,Louis Vuitton,Afternoon Swim,2ml,230,10
Completos,Jean Paul Gaultier,Le Beau Paradise Garden,125ml,2350,5
`;

// Parser de CSV sencillo con soporte para comillas.
function parseCSV(texto: string): Fila[] {
  const lineas = texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");
  if (lineas.length < 2) return [];

  const cabecera = partirLinea(lineas[0]).map((c) =>
    c.trim().toLowerCase()
  );
  const idx = (nombre: string) => cabecera.indexOf(nombre);

  const filas: Fila[] = [];
  for (let i = 1; i < lineas.length; i++) {
    const celdas = partirLinea(lineas[i]);
    filas.push({
      categoria: celdas[idx("categoria")] ?? "",
      marca: celdas[idx("marca")] ?? "",
      nombre: celdas[idx("nombre")] ?? "",
      presentacion: celdas[idx("presentacion")] ?? "",
      precio: celdas[idx("precio")] ?? "",
      stock: celdas[idx("stock")] ?? "",
    });
  }
  return filas;
}

function partirLinea(linea: string): string[] {
  const out: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (c === "," && !enComillas) {
      out.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  out.push(actual);
  return out.map((s) => s.trim());
}

export default function ImportarPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");

  const [iaActivo, setIaActivo] = useState(false);
  const [procesandoIA, setProcesandoIA] = useState(false);

  useEffect(() => {
    fetch("/api/tienda")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setIaActivo(normalizarModulos(d.modulos).iaInventario);
      })
      .catch(() => {});
  }, []);

  async function alElegirFotos(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResultado(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setProcesandoIA(true);
    try {
      const fd = new FormData();
      files.slice(0, 5).forEach((f) => fd.append("fotos", f));
      const r = await fetch("/api/ia/extraer-productos", {
        method: "POST",
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "No se pudo leer la foto");
      setFilas(Array.isArray(data.filas) ? data.filas : []);
      setNombreArchivo(`${files.length} foto(s) · leídas con IA`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setFilas([]);
    } finally {
      setProcesandoIA(false);
      e.target.value = "";
    }
  }

  function descargarCSV() {
    if (filas.length === 0) return;
    const esc = (v: string) =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const lineas = [
      COLUMNAS.join(","),
      ...filas.map((f) =>
        [f.categoria, f.marca, f.nombre, f.presentacion, f.precio, f.stock]
          .map((v) => esc(v ?? ""))
          .join(",")
      ),
    ];
    const blob = new Blob([lineas.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario-desde-foto.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function descargarPlantilla() {
    const blob = new Blob([PLANTILLA], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-perfumes.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setResultado(null);
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    const texto = await file.text();
    const parsed = parseCSV(texto);
    if (parsed.length === 0) {
      setError("No se pudieron leer filas. ¿El CSV tiene la cabecera correcta?");
      setFilas([]);
      return;
    }
    setFilas(parsed);
  }

  async function importar() {
    if (filas.length === 0) return;
    setImportando(true);
    setError("");
    try {
      const r = await fetch("/api/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filas }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al importar");
      setResultado(data);
      setFilas([]);
      setNombreArchivo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setImportando(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-white">
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-neutral-500">
            Administrador
          </p>
          <h1 className="mt-2 text-3xl font-bold">Importar catálogo</h1>
          <p className="mt-2 text-neutral-400">
            Sube un CSV para cargar muchos perfumes de golpe. Cada fila es una
            presentación; se agrupan por nombre.
          </p>
        </div>

        {/* Instrucciones */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <h2 className="font-semibold">Cómo funciona</h2>
          <p className="mt-2 text-sm text-neutral-400">
            El archivo debe tener estas columnas (en este orden):
          </p>
          <code className="mt-2 block overflow-x-auto rounded-lg bg-neutral-950 px-3 py-2 text-xs text-neutral-300">
            {COLUMNAS.join(" , ")}
          </code>
          <ul className="mt-3 space-y-1 text-sm text-neutral-400">
            <li>
              · <span className="text-neutral-300">categoria</span>: se vuelve
              una colección (ej. &quot;Decants Nicho&quot;).
            </li>
            <li>
              · Una fila por presentación (10ml, 5ml, Completo 125ml…). Mismo
              nombre = mismo perfume.
            </li>
            <li>
              · Si una presentación no aplica (N/D), no la pongas; esa fila se
              ignora.
            </li>
            <li>
              · En Excel: &quot;Guardar como → CSV UTF-8&quot;.
            </li>
          </ul>
          <button
            onClick={descargarPlantilla}
            className="mt-4 rounded-xl border border-neutral-700 px-4 py-2 text-sm font-semibold hover:border-white"
          >
            Descargar plantilla de ejemplo
          </button>
        </div>

        {/* Subir foto con IA */}
        {iaActivo && (
          <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-5">
            <h2 className="font-semibold text-emerald-300">
              ✨ Subir foto de tu lista (IA)
            </h2>
            <p className="mt-2 text-sm text-neutral-400">
              ¿No tienes Excel? Toma una foto clara de tu lista (escrita a mano o
              impresa) y la IA la convierte en productos. <strong>Revisa el
              resultado antes de importar</strong> — la IA puede equivocarse.
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={alElegirFotos}
              disabled={procesandoIA}
              className="mt-3 block w-full text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-emerald-400 disabled:opacity-50"
            />
            {procesandoIA && (
              <p className="mt-3 text-sm text-emerald-300">
                Leyendo la foto con IA… tarda unos segundos.
              </p>
            )}
          </div>
        )}

        {/* Subir archivo */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <label className="text-sm text-neutral-300">Archivo CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={alElegirArchivo}
            className="mt-2 block w-full text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-black hover:file:bg-neutral-200"
          />
          {nombreArchivo && (
            <p className="mt-2 text-sm text-neutral-500">
              {nombreArchivo} · {filas.length} fila(s) leída(s)
            </p>
          )}

          {filas.length > 0 && (
            <>
              <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-950 text-neutral-400">
                    <tr>
                      {COLUMNAS.map((c) => (
                        <th key={c} className="px-3 py-2 capitalize">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filas.slice(0, 8).map((f, i) => (
                      <tr key={i} className="border-t border-neutral-800">
                        <td className="px-3 py-1.5">{f.categoria}</td>
                        <td className="px-3 py-1.5">{f.marca}</td>
                        <td className="px-3 py-1.5">{f.nombre}</td>
                        <td className="px-3 py-1.5">{f.presentacion}</td>
                        <td className="px-3 py-1.5">{f.precio}</td>
                        <td className="px-3 py-1.5">{f.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filas.length > 8 && (
                <p className="mt-2 text-xs text-neutral-500">
                  …y {filas.length - 8} fila(s) más.
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={importar}
                  disabled={importando}
                  className="flex-1 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {importando
                    ? "Importando..."
                    : `Importar ${filas.length} filas`}
                </button>
                <button
                  onClick={descargarCSV}
                  type="button"
                  className="rounded-xl border border-neutral-700 px-5 py-3 text-sm font-semibold hover:border-white"
                >
                  Descargar CSV para revisar
                </button>
              </div>
            </>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="rounded-2xl border border-green-800 bg-green-950/30 p-5">
            <h2 className="text-lg font-semibold text-green-400">
              Importación lista
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold">{resultado.creados}</p>
                <p className="text-neutral-400">Perfumes creados</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{resultado.variantes}</p>
                <p className="text-neutral-400">Presentaciones</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{resultado.colecciones}</p>
                <p className="text-neutral-400">Colecciones</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{resultado.omitidos}</p>
                <p className="text-neutral-400">Omitidos (ya existían)</p>
              </div>
            </div>
            {resultado.errores.length > 0 && (
              <div className="mt-3 text-xs text-amber-400">
                <p className="font-semibold">Avisos:</p>
                <ul className="mt-1 space-y-0.5">
                  {resultado.errores.map((e, i) => (
                    <li key={i}>· {e}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
